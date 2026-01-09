import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WishlistItem {
  id: string;
  user_id: string;
  name: string;
  brand: string | null;
  target_price: number;
  url: string | null;
  monitor_days: number;
  is_active: boolean;
  expires_at: string;
}

interface SearchResult {
  marketplace: string;
  product_name: string;
  found_price: number;
  product_url: string;
}

const marketplaces = [
  { name: 'Mercado Livre', searchUrl: 'https://lista.mercadolivre.com.br/' },
  { name: 'Amazon', searchUrl: 'https://www.amazon.com.br/s?k=' },
  { name: 'Magazine Luiza', searchUrl: 'https://www.magazineluiza.com.br/busca/' },
  { name: 'Americanas', searchUrl: 'https://www.americanas.com.br/busca/' },
];

async function searchMarketplace(
  firecrawlApiKey: string,
  productName: string,
  brand: string | null,
  marketplace: { name: string; searchUrl: string }
): Promise<SearchResult[]> {
  const searchQuery = brand ? `${productName} ${brand}` : productName;
  const searchUrl = `${marketplace.searchUrl}${encodeURIComponent(searchQuery)}`;
  
  console.log(`Searching ${marketplace.name} for: ${searchQuery}`);
  
  try {
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: searchUrl,
        formats: [{ 
          type: 'json', 
          prompt: `Extract the first 5 product listings from this marketplace search page. For each product, extract: product_name (full product title), price (numeric value only, no currency symbol), and product_url (link to the product page). Return as JSON array with fields: product_name, price, product_url. If no products found, return empty array.`
        }],
        onlyMainContent: true,
        waitFor: 3000,
      }),
    });

    const data = await response.json();
    
    if (!response.ok || !data.success) {
      console.error(`Error from Firecrawl for ${marketplace.name}:`, data);
      return [];
    }

    const jsonData = data.data?.json || data.json || [];
    const products = Array.isArray(jsonData) ? jsonData : [];
    
    return products
      .filter((p: any) => p.price && !isNaN(parseFloat(p.price)))
      .map((p: any) => ({
        marketplace: marketplace.name,
        product_name: p.product_name || 'Produto',
        found_price: parseFloat(p.price),
        product_url: p.product_url || searchUrl,
      }));
  } catch (error) {
    console.error(`Error searching ${marketplace.name}:`, error);
    return [];
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!firecrawlApiKey) {
      console.error('FIRECRAWL_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if this is a manual search for a single item
    let itemsToSearch: WishlistItem[] = [];
    const body = await req.json().catch(() => ({}));
    
    if (body.wishlistItemId) {
      // Single item search
      const { data: item, error } = await supabase
        .from('wishlist_items')
        .select('*')
        .eq('id', body.wishlistItemId)
        .single();
      
      if (error || !item) {
        return new Response(
          JSON.stringify({ success: false, error: 'Item not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      itemsToSearch = [item];
    } else {
      // Scheduled search - get all active items that haven't expired
      const { data: items, error } = await supabase
        .from('wishlist_items')
        .select('*')
        .eq('is_active', true)
        .gte('expires_at', new Date().toISOString());
      
      if (error) {
        console.error('Error fetching wishlist items:', error);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to fetch items' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      itemsToSearch = items || [];
    }

    console.log(`Processing ${itemsToSearch.length} wishlist items`);

    let totalAlertsCreated = 0;

    for (const item of itemsToSearch) {
      const targetPrice = parseFloat(item.target_price.toString());
      const maxPrice = targetPrice * 1.20; // 20% above target
      
      console.log(`Searching for: ${item.name}, target: R$${targetPrice}, max: R$${maxPrice}`);

      // Search each marketplace
      for (const marketplace of marketplaces) {
        const results = await searchMarketplace(firecrawlApiKey, item.name, item.brand, marketplace);
        
        // Filter results: below target OR up to 20% above
        const relevantResults = results.filter(r => r.found_price <= maxPrice);
        
        console.log(`Found ${relevantResults.length} relevant results from ${marketplace.name}`);

        // Insert price alerts
        for (const result of relevantResults) {
          const isBelowTarget = result.found_price <= targetPrice;
          const priceDiffPercent = ((result.found_price - targetPrice) / targetPrice) * 100;

          const { error: insertError } = await supabase
            .from('price_alerts')
            .insert({
              wishlist_item_id: item.id,
              marketplace: result.marketplace,
              product_name: result.product_name,
              found_price: result.found_price,
              product_url: result.product_url,
              is_below_target: isBelowTarget,
              price_difference_percent: parseFloat(priceDiffPercent.toFixed(2)),
            });

          if (insertError) {
            console.error('Error inserting price alert:', insertError);
          } else {
            totalAlertsCreated++;
          }
        }

        // Add a small delay between marketplace searches to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`Search complete. Created ${totalAlertsCreated} price alerts.`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Searched ${itemsToSearch.length} items, created ${totalAlertsCreated} alerts` 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in search-prices function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

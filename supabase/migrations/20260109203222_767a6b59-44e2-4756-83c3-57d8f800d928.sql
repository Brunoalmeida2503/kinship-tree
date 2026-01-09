-- Tabela para lista de desejos persistente
CREATE TABLE public.wishlist_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  brand TEXT,
  target_price DECIMAL(10,2) NOT NULL,
  url TEXT,
  monitor_days INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para resultados de busca de preços
CREATE TABLE public.price_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wishlist_item_id UUID NOT NULL REFERENCES public.wishlist_items(id) ON DELETE CASCADE,
  marketplace TEXT NOT NULL,
  product_name TEXT NOT NULL,
  found_price DECIMAL(10,2) NOT NULL,
  product_url TEXT,
  is_below_target BOOLEAN NOT NULL,
  price_difference_percent DECIMAL(5,2),
  searched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  seen BOOLEAN NOT NULL DEFAULT false
);

-- Enable RLS
ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;

-- Policies for wishlist_items
CREATE POLICY "Users can view their own wishlist items"
ON public.wishlist_items FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own wishlist items"
ON public.wishlist_items FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own wishlist items"
ON public.wishlist_items FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own wishlist items"
ON public.wishlist_items FOR DELETE
USING (auth.uid() = user_id);

-- Policies for price_alerts
CREATE POLICY "Users can view their own price alerts"
ON public.price_alerts FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.wishlist_items
  WHERE wishlist_items.id = price_alerts.wishlist_item_id
  AND wishlist_items.user_id = auth.uid()
));

CREATE POLICY "System can create price alerts"
ON public.price_alerts FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update their own price alerts"
ON public.price_alerts FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.wishlist_items
  WHERE wishlist_items.id = price_alerts.wishlist_item_id
  AND wishlist_items.user_id = auth.uid()
));

CREATE POLICY "Users can delete their own price alerts"
ON public.price_alerts FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.wishlist_items
  WHERE wishlist_items.id = price_alerts.wishlist_item_id
  AND wishlist_items.user_id = auth.uid()
));

-- Trigger for updated_at
CREATE TRIGGER update_wishlist_items_updated_at
BEFORE UPDATE ON public.wishlist_items
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
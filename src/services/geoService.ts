// Service for fetching geographic data (countries, states, cities) and coordinates

const COUNTRIES_API = 'https://countriesnow.space/api/v0.1/countries';

export interface Country {
  name: string;
  iso2: string;
  iso3: string;
}

export interface State {
  name: string;
  state_code: string;
}

export interface City {
  name: string;
}

export const fetchCountries = async (): Promise<Country[]> => {
  try {
    const response = await fetch(`${COUNTRIES_API}`);
    const data = await response.json();
    
    if (data.error) throw new Error(data.msg);
    
    return data.data
      .map((country: any) => ({
        name: country.country,
        iso2: country.iso2,
        iso3: country.iso3
      }))
      .sort((a: Country, b: Country) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error('Error fetching countries:', error);
    return [];
  }
};

export const fetchStates = async (countryName: string): Promise<State[]> => {
  try {
    const response = await fetch(`${COUNTRIES_API}/states`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ country: countryName })
    });
    const data = await response.json();
    
    if (data.error) throw new Error(data.msg);
    
    return data.data.states
      .map((state: any) => ({
        name: state.name,
        state_code: state.state_code
      }))
      .sort((a: State, b: State) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error('Error fetching states:', error);
    return [];
  }
};

export const fetchCities = async (countryName: string, stateName: string): Promise<City[]> => {
  try {
    const response = await fetch(`${COUNTRIES_API}/state/cities`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        country: countryName,
        state: stateName
      })
    });
    const data = await response.json();
    
    if (data.error) throw new Error(data.msg);
    
    return data.data
      .map((city: string) => ({ name: city }))
      .sort((a: City, b: City) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error('Error fetching cities:', error);
    return [];
  }
};

export const fetchCoordinates = async (
  city: string, 
  state: string, 
  country: string
): Promise<{ latitude: number; longitude: number } | null> => {
  try {
    const query = `${city}, ${state}, ${country}`;
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`
    );
    const data = await response.json();
    
    if (data && data.length > 0) {
      return {
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon)
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching coordinates:', error);
    return null;
  }
};

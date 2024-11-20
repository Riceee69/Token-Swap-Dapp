//TO RESOLVE CORS ISSUE WHILE CALLING THE API FROM FRONTEND
export default async function handler(req, res) {
    // Extract query parameters from the incoming request
    const { query } = req;
  
    // Construct the target API URL with query parameters
    const apiUrl = `https://api.0x.org/swap/permit2/quote?${new URLSearchParams(query).toString()}`;
  
    try {
      // Forward the request to the actual API
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          '0x-api-key': process.env.NEXT_PUBLIC_0x_API_KEY,
          '0x-version': 'v2',
        },
      });
  
      // Parse the API's response
      const data = await response.json();
  
      // Forward the response back to the client
      res.status(response.status).json(data);
    } catch (error) {
      console.error('Proxy Error:', error);
      res.status(500).json({ error: 'Something went wrong while proxying the request.' });
    }
  }
  
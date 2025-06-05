// Utility function to make HTTPS requests that work with self-signed certificates
export async function fetchWithSelfSigned(url, options = {}) {
    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                ...(options.headers || {}),
            },
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(error);
        }

        return response;
    } catch (error) {
        console.error('Fetch error:', error);
        throw error;
    }
}
// Utility function to make HTTPS requests that work with self-signed certificates

const host = "http://localhost";
//const userPath = "/users";
const mePath = "/me";
//const usersBaseUrl= `${this._host}${this._userPath}`;

export async function fetchWithSelfSigned(url: string, options: RequestInit = {}): Promise<Response> {
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

interface UserResponse {
    [key: string]: any; // You can make this more specific based on your user object structure
}

export async function getCurrentUser(): Promise<UserResponse | null> {
	const response = await fetch(`${host}${mePath}`, {
		method: "GET"
	});
	const responseData: UserResponse = await response.json();
	if (response.status === 200)
		return responseData;
	else if (response.status === 401)
		return null;
	else
		throw new Error(`failed to get current user:\n${JSON.stringify(responseData, null, 2)}`);
} 
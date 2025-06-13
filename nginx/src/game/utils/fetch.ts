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

export async function getUserResponseData(key: string): Promise<any> {
	const userResponse = await getCurrentUser();
	
	if (!userResponse) {
		throw new Error('User not authenticated');
	}
	
	if (!userResponse.user) {
		throw new Error('Invalid user response format');
	}
	
	if (!(key in userResponse.user)) {
		throw new Error(`Key '${key}' not found in user data`);
	}
	
	return userResponse.user[key];
}

export async function registerCurrentUserForGame(tournament: boolean = false): Promise<{ id: string; username: string }> {
	const username = await getUserResponseData('username');
	const serverPort = 8081; // Game service HTTP port
	
	const response = await fetch(`http://localhost:${serverPort}/api/players`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ username, tournament }),
	});
	
	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Failed to register user for game: ${error}`);
	}
	
	const result = await response.json();
	if (!result.data || !result.data.id) {
		throw new Error('Invalid response from game service');
	}
	
	return result.data;
}
// FIXED: Updated to use current domain instead of hardcoded localhost
// This fixes CORS errors when running on real domain with HTTPS certificates

// Dynamically determine the host based on current location
const host = `${window.location.protocol}//${window.location.host}`;
//const userPath = "/users";
const mePath = "/me";


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

export async function registerCurrentUserForGame(): Promise<{ id: string; username: string }> {
	const username = await getUserResponseData('username');
	// FIXED: Use current domain instead of localhost for game service API
	// Game service is proxied through nginx, so use same domain as frontend
	
	const response = await fetch(`${host}/api/game/players`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ username }),
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
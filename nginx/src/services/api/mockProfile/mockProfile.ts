export const mockProfile = {
	avatar : {
		url : "/assets/devuser.png",
	},
	matches : {
		totalwins : 3,
		totallosses : 2,
		matches : [
			{
				opponent : {
					username : "alice",
					avatarUrl : "/assets/defaultAvatar.jpg"
				},
				score : {
					user : 11,
					opponent : 7
				},
				date: "2024-03-15T10:30:00Z"
			},
			{
				opponent : {
					username : "bob",
					avatarUrl : "/assets/defaultAvatar.jpg"
				},
				score : {
					user : 9,
					opponent : 10
				},
				date: "2024-03-14T15:00:00Z"
			},
			{
				opponent : {
					username : "charlie",
					avatarUrl : "/assets/defaultAvatar.jpg"
				},
				score : {
					user : 8,
					opponent : 11
				},
				date: "2024-03-13T18:45:00Z"
			},
			{
				opponent : {
					username : "dave",
					avatarUrl : "/assets/defaultAvatar.jpg"
				},
				score : {
					user : 11,
					opponent : 9
				},
				date: "2024-03-12T20:00:00Z"
			},
			{
				opponent : {
					username : "eve",
					avatarUrl : "/assets/defaultAvatar.jpg"
				},
				score : {
					user : 11,
					opponent : 10
				},
				date: "2024-03-11T11:20:00Z"
			}
		]
	},
	user : {
		id : 42,
		username : "devuser",
		email : "devuser@example.com",
		authenticationMethod : "credentials",
		wallet : "0x53d284357ec70cE289D6D64134DfAc8E511c8a3D",
		createdAt : "2024-01-01T12:00:00Z",
	},
	friends: [
		{
			username: 'alice',
			avatarUrl: '/assets/defaultAvatar.jpg',
			status: 'online',
			wins: 15,
			losses: 10,
			authenticationMethod: 'credentials',
			mail: 'alice@example.com',
			wallet: '0xabcdef1234567890abcdef1234567890abcdef12'
		},
		{
			username: 'bob',
			avatarUrl: '/assets/defaultAvatar.jpg',
			status: 'offline',
			wins: 8,
			losses: 12,
			authenticationMethod: 'wallet',
			wallet: '0x1234567890abcdef1234567890abcdef12345678'
		},
		{
			username: 'charlie',
			avatarUrl: '/assets/defaultAvatar.jpg',
			status: 'online',
			wins: 20,
			losses: 20,
			authenticationMethod: 'credentials',
			mail: 'charlie@example.com',
			wallet: '0xabcdef1234567890abcdef1234567890abcdef12'
		},
		{
			username: 'dave',
			avatarUrl: '/assets/defaultAvatar.jpg',
			status: 'offline',
			wins: 5,
			losses: 15,
			authenticationMethod: 'wallet',
			wallet: '0xabcdef1234567890abcdef1234567890abcdef12',
		},
		{
			username: 'eve',
			avatarUrl: '/assets/defaultAvatar.jpg',
			status: 'online',
			wins: 30,
			losses: 20,
			authenticationMethod: 'wallet',
			wallet: '0x1234567890abcdef1234567890abcdef12345678'
		}
	],
	tournament: {
		timestamp: "2024-03-20T14:00:00Z",
		matches: [
			{
				player1: "devuser",
				player2: "bob",
				score: { player1: 11, player2: 8 },
				winner: "devuser"
			},
			{
				player1: "alice",
				player2: "charlie",
				score: { player1: 11, player2: 9 },
				winner: "alice"
			},
			{
				player1: "devuser",
				player2: "alice",
				score: { player1: 11, player2: 7 },
				winner: "devuser"
			},
			{
				player1: "bob",
				player2: "charlie",
				score: { player1: 10, player2: 11 },
				winner: "charlie"
			}
		]
	}
};

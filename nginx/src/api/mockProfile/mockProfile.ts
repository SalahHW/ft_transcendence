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
				}
			},
			{
				opponent : {
					username : "bob",
					avatarUrl : "/assets/defaultAvatar.jpg"
				},
				score : {
					user : 9,
					opponent : 10
				}
			},
			{
				opponent : {
					username : "charlie",
					avatarUrl : "/assets/defaultAvatar.jpg"
				},
				score : {
					user : 8,
					opponent : 11
				}
			},
			{
				opponent : {
					username : "dave",
					avatarUrl : "/assets/defaultAvatar.jpg"
				},
				score : {
					user : 11,
					opponent : 9
				}
			},
			{
				opponent : {
					username : "eve",
					avatarUrl : "/assets/defaultAvatar.jpg"
				},
				score : {
					user : 11,
					opponent : 10
				}
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
	}
};

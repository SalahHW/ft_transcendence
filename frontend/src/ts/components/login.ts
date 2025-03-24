export function renderLogin(): HTMLElement {
	const loginForm = document.createElement('form');

	loginForm.innerHTML = /* html */ `
		<div>
			<input type="text" name="username" placeholder="Username" />
		</div>
		<div>
			<input type="password" name="password" placeholder="Password" />
		</div>
		<button type="submit">Valider</button>
	`;

	loginForm.addEventListener("submit", (e) => {
		e.preventDefault();
		const formData = new FormData(loginForm);
		const data = Object.fromEntries(formData.entries());
		const jsonData = JSON.stringify(data);
		console.log(jsonData);
	});
	fetchUsers();
	return loginForm;
}

async function fetchUsers(): Promise<any> {
	const response = await fetch("http://localhost/api/users", { method: "POST" });
	const users = await response.json();
	console.log(users);
	return (users);
}

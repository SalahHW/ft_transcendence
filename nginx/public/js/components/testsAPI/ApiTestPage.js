var ApiTestPage = /** @class */ (function () {
    function ApiTestPage(containerId) {
        this._container = document.getElementById(containerId);
        if (!this._container)
            throw new Error("Container ".concat(containerId, " note found"));
    }
    ApiTestPage.prototype.render = function () {
        this._container.innerHTML = /* HTML */ "\n\t\t<div class=\"flex flex-col md:flex-row gap-4 p-4\">\n\t\t\t<!-- Carte gauche: API Interaction -->\n\t\t\t<div class=\"w-full md:w-1/2 bg-white rounded-lg shadow-md p-4\">\n\t\t\t<h2 class=\"text-xl font-bold mb-4\">API Interaction</h2>\n\n\t\t\t<!-- Section formulaire de cr\u00E9ation -->\n\t\t\t<div class=\"mb-6\">\n\t\t\t\t<h3 class=\"text-lg font-semibold mb-2\">Create User</h3>\n\t\t\t\t<div id=\"user-form\"></div>\n\t\t\t</div>\n\n\t\t\t<!-- Section affichage utilisateur -->\n\t\t\t<div>\n\t\t\t\t<h3 class=\"text-lg font-semibold mb-2\">User Details</h3>\n\t\t\t\t<div id=\"user-display\"></div>\n\t\t\t</div>\n\t\t\t</div>\n\n\t\t\t<!-- Carte droite: Console -->\n\t\t\t<div class=\"w-full md:w-1/2 bg-gray-900 text-white rounded-lg shadow-md p-4\">\n\t\t\t<h2 class=\"text-xl font-bold mb-4\">Console Output</h2>\n\t\t\t<div id=\"console-logger\" class=\"font-mono text-sm h-[500px] overflow-y-auto\"></div>\n\t\t\t</div>\n\t\t</div>\n\t\t";
        this._initComponents();
    };
    ApiTestPage.prototype._initComponents = function () {
        import("./UserForm").then(function (module) {
            var UserForm = module.default;
            var userForm = new UserForm("user-display");
            userForm.render();
        });
    };
    return ApiTestPage;
}());
export default ApiTestPage;

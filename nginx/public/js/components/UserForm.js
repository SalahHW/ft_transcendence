var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
import UserServiceAPI from "../api/userService";
var UserForm = /** @class */ (function () {
    function UserForm(containerId) {
        this._container = document.getElementById(containerId);
        this._userService = new UserServiceAPI();
        if (!this._container)
            throw new Error("Container ".concat(containerId, " note found"));
    }
    UserForm.prototype.render = function () {
        this._container.innerHTML = /* HTML */ "\n\t\t\t<form id=\"create-user-form\" class=\"space-y-4\">\n\t\t\t\t<div>\n\t\t\t\t\t<label class=\"block text-sm font-medium text-gray-700\">Name</label>\n\t\t\t\t\t<input type=\"text\" id=\"user-name\" class=\"mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500\" required>\n\t\t\t\t</div>\n\n\t\t\t\t<div>\n\t\t\t\t\t<label class=\"block text-sm font-medium text-gray-700\">Email</label>\n\t\t\t\t\t<input type=\"email\" id=\"user-email\" class=\"mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500\" required>\n\t\t\t\t</div>\n\n\t\t\t\t<button type=\"submit\" class=\"inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500\">\n\t\t\t\t\tCreate User\n\t\t\t\t</button>\n\t\t\t</form>\n\t\t";
        this._attachEventListeners();
    };
    UserForm.prototype._attachEventListeners = function () {
        var _this = this;
        var form = document.getElementById("create-user-form");
        form.addEventListener("submit", function (element) { return __awaiter(_this, void 0, void 0, function () {
            var nameInput, emailInput, userData;
            return __generator(this, function (_a) {
                element.preventDefault();
                nameInput = document.getElementById("user-name");
                emailInput = document.getElementById("user-email");
                userData = {
                    name: nameInput.value,
                    email: emailInput.value
                };
                try {
                    /*
                    - insert create user API from user-service
                    - console.log the result
    
                }
                catch (error) {
                    console.log(`Failed to create user ${userData}:`, error);
                }
            })
        }
    
    }
                     }
                /*
                - insert create user API from user-service
                - console.log the result

            }
            catch (error) {
                console.log(`Failed to create user ${userData}:`, error);
            }
        })
    }

}
                 finally {
                }
                return [2 /*return*/];
            });
        }); });
        /*
        - insert create user API from user-service
        - console.log the result

    }
    catch (error) {
        console.log(`Failed to create user ${userData}:`, error);
    }
})
}

}
         
    };
    return UserForm;
}());
export default UserForm;
/*
- insert create user API from user-service
- console.log the result

}
catch (error) {
console.log(`Failed to create user ${userData}:`, error);
}
})
}

}
 

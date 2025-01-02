import configurations from "./config.js";

const app = angular.module("app", ["ngRoute"]);

app.constant("CONFIG", configurations);

app.config(function ($routeProvider, $locationProvider) {
  $routeProvider
    .when("/", {
      templateUrl: "app/views/home.html",
      controller: "LoginController",
    })
    .when("/registrazione", {
      templateUrl: "app/views/register.html",
      controller: "RegisterController",
    })
    .when("/password_dimenticata", {
      templateUrl: "app/views/forgot_password.html",
      controller: "PasswordDimenticataController",
    })
    .when("/reimposta_password", {
      templateUrl: "app/views/reset_password.html",
      controller: "ResetPasswordController",
    })
    .when("/modifica_password", {
      templateUrl: "app/views/edit_password.html",
      controller: "ModificaPasswordController",
    })
    .when("/contatti", {
      templateUrl: "app/views/phonebook.html",
      controller: "ContattiController",
    })
    .when("/nuovo_contatto", {
      templateUrl: "app/views/new_contact.html",
      controller: "NuovoContattoController",
    })
    .when("/modifica_contatto", {
      templateUrl: "app/views/edit_contact.html",
      controller: "ModificaContattoController",
    })
    .when("/chat", {
      templateUrl: "app/views/chat.html",
      controller: "ChatController",
    })
    .otherwise({
      redirectTo: "/",
    });

  $locationProvider.html5Mode(true);
});

app.filter("truncate", function () {
  return function (input, maxLength) {
    if (input.length > maxLength) {
      return input.substring(0, maxLength) + "...";
    }
    return input;
  };
});

app.controller("LoginController", [
  "$scope",
  "$http",
  "$location",
  "CONFIG",
  function ($scope, $http, $location, CONFIG) {
    $scope.errorMessage = "";
    $scope.user = {};

    if (localStorage.getItem("auth_token")) $location.path("/contatti");

    $scope.authenticateUser = function () {
      if (!$scope.user.username || !$scope.user.password) {
        $scope.errorMessage = "Controllare i dati inseriti";
        return;
      }
      $scope.errorMessage = "";

      $http
        .post(`${CONFIG.apiUrl}/api/user/login`, $scope.user)
        .then((res) => {
          localStorage.setItem("auth_token", res.data.token);
          $location.path("/contatti");
        })
        .catch((err) => {
          $scope.errorMessage = err.data.message;
        });
    };
  },
]);

app.controller("RegisterController", [
  "$scope",
  "$http",
  "CONFIG",
  function ($scope, $http, CONFIG) {
    $scope.registrationSuccess = false;
    $scope.registrationFailed = false;
    $scope.registrationSuccessMessage = "";
    $scope.registrationFailedMessage = "";

    $scope.user = {};

    $scope.registerUser = function () {
      $scope.registrationSuccess = false;
      $scope.registrationFailed = false;

      for (let [key, value] of Object.entries($scope.user)) {
        if (!value) {
          $scope.registrationFailed = true;
          $scope.registrationFailedMessage = "Compilare tutti i campi";
          return;
        }
      }

      if ($scope.confermaPassword != $scope.user.password) {
        $scope.registrationFailed = true;
        $scope.registrationFailedMessage =
          "Le password inserite non coincidono";
        return;
      } else if ($scope.confermaEmail != $scope.user.email) {
        $scope.registrationFailed = true;
        $scope.registrationFailedMessage = "Le email inserite non coincidono";
        return;
      }

      $http
        .post(`${CONFIG.apiUrl}/api/user/register`, $scope.user)
        .then(function (res) {
          $scope.registrationSuccess = true;
          $scope.registrationSuccessMessage = res.data.message;
          $scope.user = {};
        })
        .catch(function (err) {
          $scope.registrationFailed = true;
          $scope.registrationFailedMessage = err.data.message;
        });
    };
  },
]);

app.controller("ContattiController", [
  "$scope",
  "$http",
  "$location",
  "CONFIG",
  function ($scope, $http, $location, CONFIG) {
    const AUTH_TOKEN = localStorage.getItem("auth_token");

    $scope.allContacts = {};
    $scope.message = "";

    if (AUTH_TOKEN) {
      $scope.message = "";
      $http
        .get(`${CONFIG.apiUrl}/api/contacts/all`, {
          headers: { Authorization: "Bearer " + AUTH_TOKEN },
        })
        .then((res) => {
          if (res.data.data === null) {
            $scope.message = res.data.message;
            return;
          }
          $scope.allContacts = res.data.data;
        })
        .catch((err) => ($scope.message = err.data?.message));
    } else {
      $location.path("/");
    }

    $scope.logoutUser = function () {
      localStorage.removeItem("auth_token");
      $location.path("/");
    };

    $scope.deleteContact = function (id) {
      if (AUTH_TOKEN) {
        $http
          .delete(`${CONFIG.apiUrl}/api/contacts/delete`, {
            params: { userId: id },
            headers: { Authorization: "Bearer " + AUTH_TOKEN },
          })
          .then((res) => {
            $scope.allContacts = $scope.allContacts.filter(
              (contact) => contact.id != id
            );
          })
          .catch((err) => console.log(err));
      }
    };

    $scope.searchContacts = function () {
      let nome = $scope.nome || "";
      let cognome = $scope.cognome || "";
      let cellulare = $scope.cellulare || "";

      if (AUTH_TOKEN) {
        $http
          .get(`${CONFIG.apiUrl}/api/contacts/byValues`, {
            params: { nome: nome, cognome: cognome, cellulare: cellulare },
            headers: { Authorization: "Bearer " + AUTH_TOKEN },
          })
          .then((res) => {
            $scope.message = "";
            $scope.allContacts = res.data.data;
          })
          .catch((err) => {
            if ((err.status = 404)) {
              $scope.allContacts = {};
            }
            $scope.message = err.data.message;
          });
      }
    };
  },
]);

app.controller("NuovoContattoController", [
  "$scope",
  "$http",
  "$location",
  "CONFIG",
  function ($scope, $http, $location, CONFIG) {
    const AUTH_TOKEN = localStorage.getItem("auth_token");

    $scope.add = {};
    $scope.errorMessage = "";
    $scope.successMessage = "";

    $scope.addContact = function () {
      $scope.errorMessage = "";
      $scope.successMessage = "";
      if ($scope.add.nome && $scope.add.cognome && $scope.add.cellulare) {
        const CELL_REGEX = /^\d{10}$/;

        if (!CELL_REGEX.test($scope.add.cellulare)) {
          $scope.errorMessage = "Inserire un numero di cellulare valido";
          return;
        }

        if (AUTH_TOKEN) {
          $http
            .post(`${CONFIG.apiUrl}/api/contacts/add`, $scope.add, {
              headers: { Authorization: "Bearer " + AUTH_TOKEN },
            })
            .then((res) => {
              $scope.add = {};
              $scope.successMessage = res.data.message;
            })
            .catch((err) => {
              $scope.errorMessage = err.data.message;
            });
        }
      } else {
        $scope.errorMessage = "Compilare tutti i campi correttamente";
      }
    };
  },
]);

app.controller("ModificaContattoController", [
  "$scope",
  "$http",
  "$location",
  "CONFIG",
  function ($scope, $http, $location, CONFIG) {
    const AUTH_TOKEN = localStorage.getItem("auth_token");

    let imageUrl = "";

    $scope.successMessage = "";
    $scope.errorMessage = "";
    $scope.edit = {};
    $scope.edit.uploaded_photo = null;
    $scope.edit.photo_preview = CONFIG.photoFallback;

    if (AUTH_TOKEN) {
      $http
        .get(`${CONFIG.apiUrl}/api/contacts/byId`, {
          params: { id: $location.search().id },
          headers: { Authorization: "Bearer " + AUTH_TOKEN },
        })
        .then((res) => {
          $scope.edit.nome = res.data.data.nome;
          $scope.edit.cognome = res.data.data.cognome;
          $scope.edit.cellulare = res.data.data.cellulare;
          imageUrl = res.data.data.photoUrl;

          if (imageUrl) {
            $http
              .get(`${CONFIG.apiUrl}/api/resources/get_image`, {
                params: { imagePath: imageUrl },
                headers: { Authorization: "Bearer " + AUTH_TOKEN },
              })
              .then((res) => {
                $scope.edit.photo_preview = `data:${res.data.mime_type};base64,${res.data.data}`;
              })
              .catch(
                (err) => ($scope.edit.photo_preview = CONFIG.photoFallback)
              );
          }
        })
        .catch((err) => err.data.message);

      $scope.editContact = function () {
        const CELL_REGEX = /^\d{10}$/;

        let updatedContact = {
          id: $location.search().id,
          nome: $scope.edit.nome,
          cognome: $scope.edit.cognome,
          cellulare: $scope.edit.cellulare,
          photoUrl:
            $scope.edit.photo_preview == CONFIG.photoFallback
              ? null
              : $scope.edit.photo_preview,
        };

        $scope.successMessage = "";
        $scope.errorMessage = "";

        if (
          !updatedContact.nome ||
          !updatedContact.cognome ||
          !updatedContact.cellulare
        ) {
          $scope.errorMessage = "Compilare i campi correttamente";
          return;
        }

        if (!CELL_REGEX.test(updatedContact.cellulare)) {
          $scope.errorMessage = "Inserire un numero di cellulare valido";
          return;
        }

        $http
          .put(`${CONFIG.apiUrl}/api/contacts/edit`, updatedContact, {
            headers: { Authorization: "Bearer " + AUTH_TOKEN },
          })
          .then((res) => {
            $scope.successMessage = res.data.message;
          })
          .catch(
            (err) =>
              ($scope.errorMessage =
                err.data?.message || "Errore durante la modifica del contatto")
          );

        if ($scope.edit.uploaded_photo != null) {
          let formData = new FormData();
          formData.append("file", $scope.edit.uploaded_photo);
          formData.append("contactId", $location.search().id);

          $http.post(`${CONFIG.apiUrl}/api/contacts/upload_photo`, formData, {
            headers: {
              Authorization: "Bearer " + AUTH_TOKEN,
              "Content-Type": undefined,
            },
          });
        }
      };

      $scope.onFileChange = function (inputElement) {
        const file = inputElement.files[0];

        $scope.errorMessage = "";

        if (file) {
          const validTypes = ["image/jpeg", "image/png"];
          const maxSizeInBytes = 2 * 1024 * 1024;

          if (!validTypes.includes(file.type)) {
            $scope.$apply(function () {
              $scope.errorMessage =
                "Il file deve essere un'immagine (JPEG, PNG)";
            });
            return;
          }

          if (file.size > maxSizeInBytes) {
            $scope.$apply(function () {
              $scope.errorMessage =
                "Il file è troppo grande. La dimensione massima è di 2 MB";
            });
            return;
          }

          const reader = new FileReader();
          reader.onload = function (e) {
            $scope.$apply(function () {
              $scope.edit.photo_preview = e.target.result;
              $scope.edit.uploaded_photo = file;
            });
          };
          reader.readAsDataURL(file);
        }
      };

      $scope.removePhoto = function () {
        if ($scope.edit.photo_preview != CONFIG.photoFallback) {
          $http
            .delete(`${CONFIG.apiUrl}/api/contacts/remove_photo`, {
              params: { contactId: $location.search().id },
              headers: { Authorization: "Bearer " + AUTH_TOKEN },
            })
            .then((res) => {
              $scope.edit.photo_preview = CONFIG.photoFallback;
            });
        }
      };
    } else {
      $location.path("/");
    }
  },
]);

app.controller("PasswordDimenticataController", [
  "$scope",
  "$http",
  "CONFIG",
  function ($scope, $http, CONFIG) {
    $scope.email = "";
    $scope.errorMessage = "";
    $scope.successMessage = "";

    $scope.sendResetLink = function () {
      $scope.errorMessage = "";
      $scope.successMessage = "";

      if ($scope.email.length > 0) {
        $http
          .post(`${CONFIG.apiUrl}/api/user/send_edit_password`, null, {
            params: { email: $scope.email },
          })
          .then((res) => {
            $scope.successMessage = "Controlla la tua casella e-mail";
            $scope.email = "";
          })
          .catch((err) => ($scope.errorMessage = err.data.message));
      } else {
        $scope.errorMessage = "Inserisci un indirizzo e-mail valido";
        return;
      }
    };
  },
]);

app.controller("ResetPasswordController", [
  "$scope",
  "$http",
  "$location",
  "CONFIG",
  function ($scope, $http, $location, CONFIG) {
    if (!$location.search().reset_token) {
      $location.path("/");
    }

    $scope.isDisabled = false;
    $scope.nuova_password = "";
    $scope.conferma_password = "";
    $scope.errorMessage = "";
    $scope.successMessage = "";

    $scope.resetPassword = function () {
      $scope.errorMessage = "";
      $scope.successMessage = "";
      $scope.isDisabled = true;

      if (!$scope.nuova_password) {
        $scope.errorMessage = "Inserisci una nuova password";
        return;
      }

      if (!$scope.conferma_password) {
        $scope.errorMessage = "Inserisci nuovamente la nuova password";
        return;
      }

      if ($scope.nuova_password !== $scope.conferma_password) {
        $scope.errorMessage = "Le password inserite non corrispondono";
        return;
      }

      if (!$scope.nuova_password && !$scope.conferma_password) {
        $scope.errorMessage = "Compila i campi per reimpostare la password";
        return;
      }

      $http
        .post(`${CONFIG.apiUrl}/api/user/reset_password`, null, {
          params: {
            password: $scope.nuova_password,
            resetToken: $location.search().reset_token,
          },
        })
        .then((res) => {
          $scope.successMessage = res.data.message;
          $scope.nuova_password = "";
          $scope.conferma_password = "";
        })
        .catch((err) => {
          $scope.isDisabled = false;
          $scope.errorMessage = err.data.message;
        });
    };
  },
]);

app.controller("ModificaPasswordController", [
  "$scope",
  "$http",
  "$location",
  "CONFIG",
  function ($scope, $http, $location, CONFIG) {
    const AUTH_TOKEN = localStorage.getItem("auth_token");

    $scope.isDisabled = false;
    $scope.nuova_password = "";
    $scope.conferma_password = "";
    $scope.errorMessage = "";
    $scope.successMessage = "";

    if (!AUTH_TOKEN) {
      $location.path("/");
      return;
    }

    $scope.editPassword = function () {
      $scope.errorMessage = "";
      $scope.successMessage = "";

      if (!$scope.nuova_password) {
        $scope.errorMessage = "Inserisci una nuova password";
        return;
      }
      if (!$scope.conferma_password) {
        $scope.errorMessage = "Inserisci nuovamente la nuova password";
        return;
      }
      if ($scope.nuova_password !== $scope.conferma_password) {
        $scope.errorMessage = "Le password inserite non corrispondono";
        return;
      }
      if (!$scope.nuova_password && !$scope.conferma_password) {
        $scope.errorMessage = "Compila i campi per modificare la password";
        return;
      }

      $http
        .post(
          `${CONFIG.apiUrl}/api/user/edit_password`,
          { password: $scope.nuova_password },
          {
            headers: { Authorization: "Bearer " + AUTH_TOKEN },
          }
        )
        .then((res) => {
          $scope.successMessage = res.data.message;
          $scope.nuova_password = "";
          $scope.conferma_password = "";
        })
        .catch((err) => {
          $scope.errorMessage = err.data.message || "Errore sconosciuto";
        });
    };
  },
]);

app.controller("ChatController", [
  "$scope",
  "$http",
  "$location",
  "CONFIG",
  function ($scope, $http, $location, CONFIG) {
    const AUTH_TOKEN = localStorage.getItem("auth_token");

    // Inizializzazione
    $scope.content = "";
    $scope.currentUserId;
    $scope.selectedConversation = null;
    $scope.canSendMessage = false;
    $scope.photo_fallback = CONFIG.photoFallback;
    $scope.selectedContact = 0;

    // Data
    $scope.conversationsList = [];
    $scope.currentChat = [];

    if (AUTH_TOKEN) {
      // Recupera tutti i contatti dell'utente
      $http
        .get(`${CONFIG.apiUrl}/api/contacts/all`, {
          headers: { Authorization: "Bearer " + AUTH_TOKEN },
        })
        .then((res) => ($scope.contactsList = res.data.data));

      // Recupera tutte le conversazioni dell'utente
      $http
        .get(`${CONFIG.apiUrl}/api/chat/retrieve_conversations`, {
          headers: { Authorization: "Bearer " + AUTH_TOKEN },
        })
        .then((res) => {
          $scope.currentUserId = res.data.user;
          $scope.conversationsList = [
            ...res.data.data.messages,
            ...res.data.data.draftMessages,
          ].sort((a, b) => {
            return new Date(b.timestamp) - new Date(a.timestamp);
          });
        })
        .catch((err) => console.log(err));

      // Gestione valori Combo Box
      $scope.onContactSelect = function () {
        if ($scope.selectedContact !== 0) {
          $scope.currentChat = [];
          $scope.selectedConversation = null;
          $scope.canSendMessage = true;
        } else {
          $scope.canSendMessage =
            Object.keys($scope.currentChat).length === 0 ? false : true;
        }
      };

      // Cambio conversazione
      $scope.selectConversation = function (conversation) {
        $scope.selectedContact = 0;
        $scope.canSendMessage = true;

        if (conversation.receiver) {
          $scope.selectedConversation =
            conversation.sender.id === $scope.currentUserId
              ? conversation.receiver.id
              : conversation.sender.id;
        } else if (conversation.contactReceiver) {
          $scope.selectedConversation = conversation.contactReceiver.id;
        }

        $http
          .post(
            `${CONFIG.apiUrl}/api/chat/retrieve_conversation_messages`,
            null,
            {
              params: {
                sender_id: $scope.currentUserId,
                receiver_id: $scope.selectedConversation,
              },
              headers: { Authorization: "Bearer " + AUTH_TOKEN },
            }
          )
          .then((res) => {
            $scope.currentChat = res.data.data;
            const index = $scope.conversationsList.findIndex(
              (c) => c.id === conversation.id
            );
            if (index !== -1) {
              $scope.conversationsList[index].read = true;
            }
            angular
              .element(
                document.querySelector(
                  `.conversation-item[data-conversation-id="${conversation.id}"]`
                )
              )
              .removeClass("unread-message");
          })
          .catch((err) => console.log(err));
      };

      // Recupera Nome e Cognome delle conversazioni
      $scope.getConversationName = function (conversation) {
        if (conversation.receiver) {
          return conversation.sender.id === $scope.currentUserId
            ? conversation.receiver.nome + " " + conversation.receiver.cognome
            : conversation.sender.nome + " " + conversation.sender.cognome;
        } else if (conversation.contactReceiver) {
          return (
            conversation.contactReceiver.nome +
            " " +
            conversation.contactReceiver.cognome
          );
        }
        return "Utente sconosciuto";
      };

      // Invio messaggio
      $scope.sendMessage = function () {
        if (!$scope.content) return;

        let messageData = {
          senderId: $scope.currentUserId,
          receiverId: $scope.selectedConversation || $scope.selectedContact,
          content: $scope.content,
        };

        $http
          .post(`${CONFIG.apiUrl}/api/chat/send_message`, messageData, {
            headers: {
              Authorization: "Bearer " + AUTH_TOKEN,
            },
          })
          .then(
            function (response) {
              $scope.content = "";

              // Aggiorna la chat corrente
              $http
                .post(
                  `${CONFIG.apiUrl}/api/chat/retrieve_conversation_messages`,
                  null,
                  {
                    params: {
                      sender_id: $scope.currentUserId,
                      receiver_id:
                        $scope.selectedConversation || $scope.selectedContact,
                    },
                    headers: { Authorization: "Bearer " + AUTH_TOKEN },
                  }
                )
                .then((res) => {
                  $scope.currentChat = res.data.data;
                })
                .catch((err) => console.log(err));

              // Aggiorna le conversazioni
              $http
                .get(`${CONFIG.apiUrl}/api/chat/retrieve_conversations`, {
                  headers: { Authorization: "Bearer " + AUTH_TOKEN },
                })
                .then((res) => {
                  $scope.currentUserId = res.data.user;
                  $scope.conversationsList = [
                    ...res.data.data.messages,
                    ...res.data.data.draftMessages,
                  ].sort((a, b) => {
                    return new Date(b.timestamp) - new Date(a.timestamp);
                  });
                })
                .catch((err) => console.log(err));
            },
            function (error) {
              console.error("Errore invio messaggio:", error);
            }
          );
      };
    } else {
      $location.path("/");
    }
  },
]);

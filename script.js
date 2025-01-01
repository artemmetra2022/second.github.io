// Импорт Firebase модулей
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, deleteDoc, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";

// Конфигурация Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBnxbzgVDndgv5tb9hTf9-_s6Upr1wngU0",
    authDomain: "meineproject-5d634.firebaseapp.com",
    projectId: "meineproject-5d634",
    storageBucket: "meineproject-5d634.appspot.com",
    messagingSenderId: "1064508732292",
    appId: "1:1064508732292:web:edb07e5a1a8c829c21e3d1",
    measurementId: "G-7J8FW0DN4S"
};

// Инициализация Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app); // Инициализация Firestore
const auth = getAuth(app); // Инициализация Authentication

// Функция для проверки существования элемента перед добавлением обработчика
function addEventListenerIfExists(elementId, eventType, callback) {
    const element = document.getElementById(elementId);
    if (element) {
        element.addEventListener(eventType, callback);
    } else {
        console.warn(`Элемент с ID "${elementId}" не найден.`);
    }
}

// Функция для отображения сообщений об ошибках и успехе
function showMessage(elementId, message, isError = true) {
    const messageDiv = document.getElementById(elementId);
    if (messageDiv) {
        messageDiv.textContent = message;
        messageDiv.style.display = 'block';
        messageDiv.style.backgroundColor = isError ? '#ff6b6b' : '#4caf50';
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 3000);
    } else {
        console.error(`Элемент с ID "${elementId}" не найден.`);
    }
}

// Отображение имени пользователя и кнопки "Выйти"
function displayProfileLink() {
    const profileLink = document.getElementById('profile-link');
    const profileName = document.getElementById('profile-name');
    const currentUser = localStorage.getItem('currentUser');

    if (profileLink && profileName && currentUser) {
        getDoc(doc(db, 'users', currentUser)).then((userDoc) => {
            if (userDoc.exists()) {
                profileName.textContent = userDoc.data().username;
                profileLink.style.display = 'flex';
            }
        });
    }
}

// Выход из системы
addEventListenerIfExists('logout', 'click', function() {
    signOut(auth).then(() => {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('currentUsername');
        window.location.href = 'index.html'; // Перенаправление на главную страницу
    }).catch((error) => {
        showMessage('error-message', 'Ошибка при выходе из системы: ' + error.message);
    });
});

// Регистрация пользователя (только для register.html)
if (window.location.pathname.endsWith('register.html')) {
    addEventListenerIfExists('registerForm', 'submit', function(event) {
        event.preventDefault();

        const email = document.getElementById('email')?.value;
        const password = document.getElementById('password')?.value;
        const username = document.getElementById('username')?.value;
        const bio = document.getElementById('bio')?.value || '';

        if (!email || !password || !username) {
            showMessage('error-message', 'Пожалуйста, заполните все обязательные поля.');
            return;
        }

        createUserWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                const userId = userCredential.user.uid;
                setDoc(doc(db, 'users', userId), {
                    auth: "User123",
                    bio: bio,
                    createdAt: new Date().toISOString(),
                    email: email,
                    isOnline: false,
                    lastSeen: new Date().toISOString(),
                    role: "user",
                    userId: userId,
                    username: username
                }).then(() => {
                    showMessage('success-message', 'Регистрация успешна', false);
                    notifyNewUser(username); // Уведомление о новом пользователе
                    setTimeout(() => {
                        window.location.href = 'login.html';
                    }, 2000);
                });
            })
            .catch((error) => {
                showMessage('error-message', 'Ошибка при регистрации: ' + error.message);
            });
    });
}

// Вход пользователя (только для login.html)
if (window.location.pathname.endsWith('login.html')) {
    addEventListenerIfExists('loginForm', 'submit', function(event) {
        event.preventDefault();

        const email = document.getElementById('email')?.value;
        const password = document.getElementById('password')?.value;

        if (!email || !password) {
            showMessage('error-message', 'Пожалуйста, заполните все поля.');
            return;
        }

        signInWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                const userId = userCredential.user.uid;
                getDoc(doc(db, 'users', userId))
                    .then((userDoc) => {
                        if (userDoc.exists()) {
                            const userData = userDoc.data();
                            localStorage.setItem('currentUser', userId);
                            localStorage.setItem('currentUsername', userData.username);
                            updateDoc(doc(db, 'users', userId), {
                                isOnline: true,
                                lastSeen: new Date().toISOString()
                            });
                            window.location.href = 'messages.html';
                        } else {
                            showMessage('error-message', 'Данные пользователя не найдены.');
                        }
                    })
                    .catch((error) => {
                        showMessage('error-message', 'Ошибка при получении данных пользователя: ' + error.message);
                    });
            })
            .catch((error) => {
                showMessage('error-message', 'Ошибка при входе: ' + error.message);
            });
    });
}

// Отправка сообщения (только для messages.html)
if (window.location.pathname.endsWith('messages.html')) {
    addEventListenerIfExists('messageForm', 'submit', function(event) {
        event.preventDefault();

        const message = document.getElementById('message')?.value;
        const userId = localStorage.getItem('currentUser');
        const username = localStorage.getItem('currentUsername');
        const timestamp = new Date().toISOString();
        const replyTo = document.getElementById('replyTo').value; // ID сообщения, на которое отвечают

        if (!message || !userId || !username) {
            showMessage('error-message', 'Пожалуйста, заполните все поля.');
            return;
        }

        addDoc(collection(db, 'messages'), {
            userId: userId,
            username: username,
            message: message,
            timestamp: timestamp,
            replyTo: replyTo // Сохраняем ID сообщения, на которое отвечаем
        }).then(() => {
            document.getElementById('message').value = '';
            document.getElementById('replyTo').value = ''; // Очищаем поле replyTo
        }).catch((error) => {
            showMessage('error-message', 'Ошибка отправки сообщения: ' + error.message);
        });
    });

    // Очистка чата (только для текущего пользователя)
    addEventListenerIfExists('clearChat', 'click', function() {
        const userId = localStorage.getItem('currentUser');
        if (userId) {
            const messagesDiv = document.getElementById('messages');
            if (messagesDiv) {
                // Удаляем только сообщения текущего пользователя
                const userMessages = messagesDiv.querySelectorAll(`[data-user-id="${userId}"]`);
                userMessages.forEach(message => message.remove());
                showMessage('success-message', 'Ваши сообщения удалены.', false);
            }
        }
    });

    // Отображение сообщений (только для messages.html)
    function displayMessages() {
        const messagesDiv = document.getElementById('messages');
        if (messagesDiv) {
            messagesDiv.innerHTML = '';

            onSnapshot(collection(db, 'messages'), (snapshot) => {
                messagesDiv.innerHTML = '';

                snapshot.forEach((doc) => {
                    const msg = doc.data();
                    const messageElement = document.createElement('div');
                    messageElement.setAttribute('data-user-id', msg.userId); // Добавляем атрибут для идентификации пользователя
                    messageElement.classList.add(msg.userId === "BOT" ? 'bot-message' : 'user-message');

                    if (msg.replyTo) {
                        messageElement.classList.add('reply');
                        const repliedMessage = snapshot.docs.find(d => d.id === msg.replyTo)?.data();
                        if (repliedMessage) {
                            messageElement.innerHTML = `
                                <div class="quote">${repliedMessage.username}: ${repliedMessage.message}</div>
                                <strong>${msg.username}</strong> 
                                <span class="time">${new Date(msg.timestamp).toLocaleTimeString()}</span>: 
                                ${msg.message}
                                <button class="reply-btn" data-message-id="${doc.id}">Ответить</button>
                                <button class="delete-btn" data-message-id="${doc.id}">Удалить</button>
                            `;
                        }
                    } else {
                        messageElement.innerHTML = `
                            <strong>${msg.username}</strong> 
                            <span class="time">${new Date(msg.timestamp).toLocaleTimeString()}</span>: 
                            ${msg.message}
                            <button class="reply-btn" data-message-id="${doc.id}">Ответить</button>
                            <button class="delete-btn" data-message-id="${doc.id}">Удалить</button>
                        `;
                    }

                    messagesDiv.appendChild(messageElement);

                    // Обработчик для кнопки "Ответить"
                    messageElement.querySelector('.reply-btn')?.addEventListener('click', function() {
                        const messageId = this.getAttribute('data-message-id');
                        document.getElementById('replyTo').value = messageId; // Устанавливаем ID сообщения, на которое отвечаем
                        document.getElementById('message').focus();
                    });

                    // Обработчик для кнопки "Удалить"
                    messageElement.querySelector('.delete-btn')?.addEventListener('click', function() {
                        const userId = localStorage.getItem('currentUser');
                        if (isAdmin()) {
                            openDeleteReasonModal(doc.id); // Открываем модальное окно для администратора
                        } else {
                            deleteMessageForUser(doc.id); // Удаляем сообщение для обычного пользователя
                        }
                    });
                });
            });
        }
    }

    // Проверка, является ли пользователь админом
    function isAdmin() {
        const currentUser = localStorage.getItem('currentUser');
        if (currentUser) {
            return getDoc(doc(db, 'users', currentUser)).then((userDoc) => {
                return userDoc.exists() && userDoc.data().role === 'admin';
            });
        }
        return false;
    }

    // Удаление сообщения для обычного пользователя
    function deleteMessageForUser(messageId) {
        const messagesDiv = document.getElementById('messages');
        const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
        if (messageElement) {
            messageElement.remove();
            showMessage('success-message', 'Сообщение удалено только для вас.', false);
        }
    }

    // Открытие модального окна для ввода причины удаления (только для администраторов)
    function openDeleteReasonModal(messageId) {
        const modal = document.getElementById('deleteReasonModal');
        const deleteReasonInput = document.getElementById('deleteReason');
        const confirmDeleteButton = document.getElementById('confirmDelete');

        if (modal && deleteReasonInput && confirmDeleteButton) {
            modal.style.display = 'flex'; // Показываем модальное окно

            // Обработчик для кнопки "Удалить" в модальном окне
            confirmDeleteButton.onclick = function() {
                const reason = deleteReasonInput.value.trim();
                if (reason) {
                    deleteDoc(doc(db, 'messages', messageId)).then(() => {
                        showMessage('success-message', 'Сообщение удалено.', false);
                        modal.style.display = 'none'; // Скрываем модальное окно
                    }).catch((error) => {
                        showMessage('error-message', 'Ошибка при удалении сообщения: ' + error.message);
                    });
                } else {
                    showMessage('error-message', 'Пожалуйста, введите причину удаления.');
                }
            };

            // Закрытие модального окна при клике на крестик
            modal.querySelector('.close').onclick = function() {
                modal.style.display = 'none';
            };

            // Закрытие модального окна при клике вне его области
            window.onclick = function(event) {
                if (event.target === modal) {
                    modal.style.display = 'none';
                }
            };
        }
    }

    // Уведомление о новом пользователе
    function notifyNewUser(username) {
        addDoc(collection(db, 'messages'), {
            userId: "BOT",
            username: "BOT",
            message: `На сайте был зарегистрирован новый человек: ${username}.`,
            timestamp: new Date().toISOString()
        });
    }

    displayMessages();
    displayProfileLink(); // Отображение имени пользователя и кнопки "Выйти"
}
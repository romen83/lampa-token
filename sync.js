(function () {
    'use strict';

    // НАЛАШТУВАННЯ JSONBin.io
    const BIN_ID = '6af1c600ac6210605a79cb20';
    const API_KEY = '$2a$10$5HmUCa8V6Q1TzUe5.D1Oeu4LfJCPdwbdWXxiUx3PJuBAou7JCo7g6';
    const USER_ID = 'romen83'; // однаковий на планшеті й ТБ

    const JSONBIN_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

    // 1. Функція збереження прогресу в JSONBin
    function saveProgress(data) {
        if (!data || !data.card || !data.card.id) return;
        const movieId = String(data.card.id);

        fetch(JSONBIN_URL + '/latest', {
            headers: { 'X-Master-Key': API_KEY }
        })
        .then(res => res.json())
        .then(response => {
            let db = response.record || {};
            if (!db.movies) db.movies = {};

            db.movies[movieId] = {
                user_id: USER_ID,
                title: data.card.title || data.card.name,
                time: Math.round(data.time),
                duration: Math.round(data.duration || 0),
                updated_at: Date.now()
            };

            return fetch(JSONBIN_URL, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Master-Key': API_KEY
                },
                body: JSON.stringify(db)
            });
        })
        .catch(err => console.error('Lampa Sync Save Error:', err));
    }

    // 2. Функція підтягування прогресу з JSONBin (для синхронізації на ТБ)
    function restoreProgress(card) {
        if (!card || !card.id) return;
        const movieId = String(card.id);

        fetch(JSONBIN_URL + '/latest', {
            headers: { 'X-Master-Key': API_KEY }
        })
        .then(res => res.json())
        .then(response => {
            let db = response.record || {};
            if (!db.movies || !db.movies[movieId]) return;

            let item = db.movies[movieId];
            if (item.time && item.time > 5) {
                Lampa.Storage.set('time_' + movieId, item.time);
            }
        })
        .catch(err => console.error('Lampa Sync Load Error:', err));
    }

    // Слідкуємо за завершенням зовнішніх плеєрів (MX Player, Just Player тощо)
    Lampa.Listener.follow('activity', function (e) {
        if (e.type === 'start' && e.object && e.object.card) {
            restoreProgress(e.object.card);
        }
    });

    Lampa.Player.listener.follow('destroy', function (e) {
        let data = {
            card: Lampa.Player.data().movie,
            time: Lampa.Player.position(),
            duration: Lampa.Player.duration()
        };
        saveProgress(data);
    });

})();

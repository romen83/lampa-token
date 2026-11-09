(function () {
    'use strict';

    const BIN_ID = '6af1955dffd5d16053b2fcb7';
    const API_KEY = '$2a$10$tPDvcNxXaQBCTxl.myb40OZc13gfYmRl.a2NxaiLYCKVy0LrU2yii';
    const USER_ID = 'romen83';

    const JSONBIN_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

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
        .then(() => {
            console.log('Lampa Sync: Progress saved successfully!');
        })
        .catch(err => console.error('Lampa Sync Save Error:', err));
    }

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
                console.log('Lampa Sync: Restored time ->', item.time);
            }
        })
        .catch(err => console.error('Lampa Sync Load Error:', err));
    }

    // Відстежуємо запуск фільму
    Lampa.Listener.follow('activity', function (e) {
        if (e.type === 'start' && e.object && e.object.card) {
            restoreProgress(e.object.card);
        }
    });

    // Зберігаємо прогрес під час перегляду (кожні зміни часу) та при закритті
    Lampa.Player.listener.follow('timeupdate', function (e) {
        if (e.target && e.target.card && e.target.time > 0) {
            // Зберігаємо кожні 30 секунд щоб не перевантажувати мережу
            if (Math.round(e.target.time) % 30 === 0) {
                saveProgress({
                    card: e.target.card,
                    time: e.target.time,
                    duration: e.target.duration()
                });
            }
        }
    });

    Lampa.Player.listener.follow('destroy', function (e) {
        let current_card = Lampa.Player.data().movie;
        let current_time = Lampa.Player.position();
        let current_duration = Lampa.Player.duration();

        if (current_card) {
            saveProgress({
                card: current_card,
                time: current_time,
                duration: current_duration
            });
        }
    });

})();

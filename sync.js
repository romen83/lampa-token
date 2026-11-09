
(function () {
    'use strict';

    const BIN_ID = '6af1c600ac6210605a79cb20';
    const API_KEY = '$2a$10$tPDvcNxXaQBCTxl.myb40OZc13gfYmRl.a2NxaiLYCKVy0LrU2yii';
    const USER_ID = 'romen83';

    const JSONBIN_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

    function showNotice(text) {
        if (typeof Lampa !== 'undefined' && Lampa.Noty) {
            Lampa.Noty.show(text);
        }
    }

    function saveProgress(data) {
        if (!data || !data.card || !data.card.id) return;
        const movieId = String(data.card.id);
        if (!data.time || data.time < 5) return;

        showNotice('Синхронізація: Зберігаємо...');

        fetch(JSONBIN_URL + '/latest', {
            headers: { 'X-Master-Key': API_KEY }
        })
        .then(res => {
            if (!res.ok) throw new Error('Помилка читання з JSONBin: ' + res.status);
            return res.json();
        })
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
        .then(res => {
            if (!res.ok) throw new Error('Помилка запису: ' + res.status);
            showNotice('Синхронізація: Успішно збережено!');
        })
        .catch(err => {
            console.error('Lampa Sync Error:', err);
            showNotice('Помилка синхронізації (див. консоль)');
        });
    }

    // Перехоплюємо подію таймлайну Лампи
    if (typeof Lampa !== 'undefined' && Lampa.Timeline) {
        let originalTimelineSet = Lampa.Timeline.set;
        Lampa.Timeline.set = function (data) {
            if (originalTimelineSet) {
                originalTimelineSet.apply(this, arguments);
            }
            if (data && data.card && data.card.id) {
                saveProgress({
                    card: data.card,
                    time: data.time,
                    duration: data.duration
                });
            }
        };
    }
})();

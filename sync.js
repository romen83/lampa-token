(function () {
    'use strict';

    const BIN_ID = '6af1955dffd5d16053b2fcb7';
    const API_KEY = '$2a$10$tPDvcNxXaQBCTxl.myb40OZc13gfYmRl.a2NxaiLYCKVy0LrU2yii';
    const USER_ID = 'romen83';

    const JSONBIN_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

    function saveProgress(data) {
        if (!data || !data.card || !data.card.id) return;
        const movieId = String(data.card.id);
        if (!data.time || data.time < 5) return; // Ігноруємо надто короткий перегляд

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
                updated_at: Date.Now?.() || Date.now()
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
                if (Lampa.Timeline && Lampa.Timeline.set) {
                    Lampa.Timeline.set({
                        card: card,
                        time: item.time,
                        duration: item.duration || 0
                    });
                }
                console.log('Lampa Sync: Restored time ->', item.time);
            }
        })
        .catch(err => console.error('Lampa Sync Load Error:', err));
    }

    // Перехоплюємо збереження історії Лампи (працює і з зовнішніми плеєрами)
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

    // Відновлюємо прогрес при відкритті картки фільму/серіалу
    Lampa.Listener.follow('activity', function (e) {
        if (e.type === 'start' && e.object && e.object.card) {
            restoreProgress(e.object.card);
        }
    });

})();

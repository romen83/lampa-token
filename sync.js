(function () {
    'use strict';

    // НАЛАШТУВАННЯ JSONBin.io
    const BIN_ID = '6af1955dffd5d16053b2fcb7';
    const API_KEY = '$2a$10$tPDvcNxXaQBCTxl.myb40OZc13gfYmRl.a2NxailYCKVyOLrU2yii';
    const USER_ID = ''my_home_sync_2027'
'; // однаковий на планшеті й ТБ

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
            if (db.movies && db.movies[movieId]) {
                let saved = db.movies[movieId];
                if (saved.time > 0) {
                    // Передаємо час у локальний Timeline Lampa
                    Lampa.Timeline.update({
                        hash: card.id,
                        time: saved.time,
                        duration: saved.duration,
                        percent: saved.duration ? Math.round((saved.time / saved.duration) * 100) : 0
                    });
                }
            }
        })
        .catch(err => console.error('Lampa Sync Restore Error:', err));
    }

    // 3. Відстеження внутрішнього плеєра Lampa
    Lampa.Listener.follow('player', function (e) {
        if (e.type === 'timeupdate' || e.type === 'destroy') {
            if (e.target && e.target.card && e.target.time > 0) {
                saveProgress({
                    card: e.target.card,
                    time: e.target.time,
                    duration: e.target.duration
                });
            }
        }
    });

    // 4. Відстеження зовнішніх плеєрів (MX Player, Just Player тощо)
    // Перехоплюємо повернення з будь-якого зовнішнього Android-плеєра
    Lampa.Listener.follow('activity', function (e) {
        // При відкритті картки фільму — зчитуємо збережений час із хмари
        if (e.type === 'start' && e.object && e.object.card) {
            restoreProgress(e.object.card);
        }

        // При закритті картки або поверненні із зовнішнього плеєра (Just Player / MX Player)
        if (e.type === 'back' || e.type === 'destroy' || e.type === 'intent') {
            let activeActivity = Lampa.Activity.active();
            if (activeActivity && activeActivity.card) {
                let currentCard = activeActivity.card;
                let viewData = Lampa.Timeline.view(currentCard.id);
                if (viewData && viewData.time) {
                    saveProgress({
                        card: currentCard,
                        time: viewData.time,
                        duration: viewData.duration || 0
                    });
                }
            }
        }
    });

    console.log('JSONBin Sync Plugin (MX Player & Just Player) loaded successfully.');
})();

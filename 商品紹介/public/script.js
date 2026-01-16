document.addEventListener('DOMContentLoaded', () => {
    const fileInputs = document.querySelectorAll('.file-input');
    const uploadForm = document.getElementById('upload-form');

    // --- 1. プレビュー表示機能 ---
    fileInputs.forEach(input => {
        input.addEventListener('change', function() {
            const sceneId = this.getAttribute('data-scene');
            const slotId = this.getAttribute('data-slot');
            
            // スロットがある場合は個別ID（Scene 4用）、ない場合は標準ID
            const targetId = slotId ? `preview-${sceneId}-${slotId}` : `preview-${sceneId}`;
            const previewContainer = document.getElementById(targetId);
            
            previewContainer.innerHTML = ''; 

            const file = this.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    let media;
                    if (file.type.startsWith('image/')) {
                        media = document.createElement('img');
                    } else if (file.type.startsWith('video/')) {
                        media = document.createElement('video');
                        media.controls = true;
                    }
                    if (media) {
                        media.src = e.target.result;
                        previewContainer.appendChild(media);
                    }
                };
                reader.readAsDataURL(file);
            }
        });
    });

    // --- 2. バリデーションとサーバーへの送信処理 ---
    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // 【入力チェック】
        let errors = [];
        const scenes = document.querySelectorAll('.scene');
        
        scenes.forEach((scene, index) => {
            const sNum = index + 1;
            const fInputs = scene.querySelectorAll('input[type="file"]');
            const tInputs = scene.querySelectorAll('input[type="text"], textarea');

            fInputs.forEach((fi, fIdx) => {
                if (fi.files.length === 0) {
                    const label = fInputs.length > 1 ? `の${fIdx + 1}枚目` : "";
                    errors.push(`Scene 0${sNum}${label}のメディアが未選択です。`);
                }
            });

            tInputs.forEach((ti, tIdx) => {
                if (!ti.value.trim()) {
                    const label = tInputs.length > 1 ? `のテキスト${tIdx + 1}` : "のテキスト";
                    errors.push(`Scene 0${sNum}${label}を入力してください。`);
                }
            });
        });

        // エラーがあれば表示して中断
        if (errors.length > 0) {
            alert("入力不備があります：\n\n" + errors.join("\n"));
            return;
        }

        // --- 3. バックエンド（Render）への実送信処理 ---
        const btn = document.getElementById('submit-btn');
        btn.disabled = true;
        btn.innerText = "データをBoxへ送信中...";

        const formData = new FormData();

        // シーンごとのデータを収集してFormDataに追加
        scenes.forEach((scene, index) => {
            const sKey = `Scene${index + 1}`;
            
            // テキストデータの取得
            const tInputs = scene.querySelectorAll('input[type="text"], textarea');
            tInputs.forEach((ti, tIdx) => {
                formData.append(`${sKey}_Text_${tIdx + 1}`, ti.value);
            });

            // ファイルデータの取得
            const fInputs = scene.querySelectorAll('input[type="file"]');
            fInputs.forEach((fi, fIdx) => {
                if (fi.files[0]) {
                    // Box側で判別しやすいように名前を付けて送信
                    formData.append('files', fi.files[0], `${sKey}_Media_${fIdx + 1}_${fi.files[0].name}`);
                }
            });
        });

        try {
            // RenderのサーバーへPOSTリクエスト
            const response = await fetch('/upload', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                // 成功：完了画面へ切り替え
                document.getElementById('main-content').style.display = 'none';
                document.getElementById('success-message').style.display = 'block';
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                throw new Error("アップロードに失敗しました。");
            }

        } catch (error) {
            alert("エラーが発生しました。インターネット接続やBoxの期限を確認してください。");
            btn.disabled = false;
            btn.innerText = "データを送信";
        }
    });
});
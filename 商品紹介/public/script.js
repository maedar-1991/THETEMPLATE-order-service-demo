document.addEventListener('DOMContentLoaded', () => {
    const fileInputs = document.querySelectorAll('.file-input');
    const uploadForm = document.getElementById('upload-form');

    // --- 1. プレビュー表示機能 ---
    fileInputs.forEach(input => {
        input.addEventListener('change', function() {
            const sceneId = this.getAttribute('data-scene');
            const slotId = this.getAttribute('data-slot');
            const targetId = slotId ? `preview-${sceneId}-${slotId}` : `preview-${sceneId}`;
            const previewContainer = document.getElementById(targetId);
            
            previewContainer.innerHTML = '';
            const file = this.files[0];

            if (file) {
                // .ai や .psd はブラウザでプレビューできないため代替表示
                if (file.name.endsWith('.ai') || file.name.endsWith('.psd')) {
                    const icon = document.createElement('div');
                    icon.innerHTML = `<p style="color:white; padding:20px;">${file.name}<br>(プレビュー非対応形式)</p>`;
                    previewContainer.appendChild(icon);
                    return;
                }

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

    // --- 2. リアルタイム文字数チェック ---
    const textInputs = document.querySelectorAll('input[type="text"], textarea');
    textInputs.forEach(input => {
        const errorMsg = document.createElement('p');
        errorMsg.className = 'char-error';
        errorMsg.style.color = 'red';
        errorMsg.style.fontSize = '0.8rem';
        errorMsg.style.marginTop = '5px';
        errorMsg.style.display = 'none';
        errorMsg.innerText = '文字数が制限を超えています';
        input.parentNode.appendChild(errorMsg);

        input.addEventListener('input', function() {
            const maxLength = this.getAttribute('maxlength');
            if (maxLength && this.value.length >= maxLength) {
                // 最大文字数に達した（あるいは超えた）場合に表示
                errorMsg.style.display = 'block';
                this.style.borderColor = 'red';
            } else {
                errorMsg.style.display = 'none';
                this.style.borderColor = '#ddd';
            }
        });
    });

    // --- 3. サーバーへの送信処理 ---
    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('submit-btn');
        btn.disabled = true;
        btn.innerText = "データをBoxへ送信中...";

        const formData = new FormData(uploadForm);

        try {
            const response = await fetch('/upload', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                document.getElementById('main-content').style.display = 'none';
                document.getElementById('success-message').style.display = 'block';
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                throw new Error("アップロードに失敗しました。");
            }
        } catch (error) {
            alert("エラーが発生しました。接続を確認してください。");
            btn.disabled = false;
            btn.innerText = "データを送信";
        }
    });
});

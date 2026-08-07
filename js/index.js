// --- LocalStorageによる設定の保存と復元 ---
function saveSettings() {
	const settings = {
		folderNumber: document.getElementById('setting-folder-number').checked,
		urlDomain: document.getElementById('setting-url-domain').checked,
		readmeHeading: document.getElementById('setting-readme-heading').value,
		readmeAuto: document.getElementById('setting-readme-auto').checked,
		readmeWidth: document.getElementById('setting-readme-width').value,
		readmeHeight: document.getElementById('setting-readme-height').value,
		readmeFontSize: document.getElementById('setting-readme-font-size').value,
		readmeBg: document.getElementById('setting-readme-bg').value,
		readmeFont: document.getElementById('setting-readme-font').value,
		alarmTime: document.getElementById('setting-alarm-time').value,
		alarmVol: document.getElementById('setting-alarm-vol').value
	};
	localStorage.setItem('kokekokkoAppSettings', JSON.stringify(settings));
}

function loadSettings() {
	const saved = localStorage.getItem('kokekokkoAppSettings');
	if (saved) {
		try {
			const settings = JSON.parse(saved);
			if (settings.folderNumber !== undefined) document.getElementById('setting-folder-number').checked = settings.folderNumber;
			if (settings.urlDomain !== undefined) document.getElementById('setting-url-domain').checked = settings.urlDomain;
			if (settings.readmeHeading !== undefined) document.getElementById('setting-readme-heading').value = settings.readmeHeading;
			if (settings.readmeAuto !== undefined) document.getElementById('setting-readme-auto').checked = settings.readmeAuto;
			if (settings.readmeWidth !== undefined) document.getElementById('setting-readme-width').value = settings.readmeWidth;
			if (settings.readmeHeight !== undefined) document.getElementById('setting-readme-height').value = settings.readmeHeight;
			if (settings.readmeFontSize !== undefined) document.getElementById('setting-readme-font-size').value = settings.readmeFontSize;
			if (settings.readmeBg !== undefined) document.getElementById('setting-readme-bg').value = settings.readmeBg;
			if (settings.readmeFont !== undefined) document.getElementById('setting-readme-font').value = settings.readmeFont;
			if (settings.alarmTime !== undefined) document.getElementById('setting-alarm-time').value = settings.alarmTime;
			if (settings.alarmVol !== undefined) {
				document.getElementById('setting-alarm-vol').value = settings.alarmVol;
				document.getElementById('alarm-vol-display').innerText = Math.round(settings.alarmVol * 100) + '%';
			}
		} catch (e) {
			console.error("設定の復元に失敗しました", e);
		}
	}
}

// --- 画面切り替え制御 ---
const navCsvBtn = document.getElementById('nav-csv-btn');
const navPreviewBtn = document.getElementById('nav-preview-btn');
const frameCsv = document.getElementById('frame-csv');
const framePreview = document.getElementById('frame-preview');

navCsvBtn.addEventListener('click', () => {
	navCsvBtn.classList.add('active');
	navPreviewBtn.classList.remove('active');
	frameCsv.style.display = 'block';
	framePreview.style.display = 'none';
});

navPreviewBtn.addEventListener('click', () => {
	navPreviewBtn.classList.add('active');
	navCsvBtn.classList.remove('active');
	frameCsv.style.display = 'none';
	framePreview.style.display = 'block';
});

// --- モーダル制御 ---
const helpTabBtns = document.querySelectorAll('.help-tab-btn');
const helpTabContents = document.querySelectorAll('.help-tab-content');

helpTabBtns.forEach(btn => {
	btn.addEventListener('click', () => {
		helpTabBtns.forEach(b => b.classList.remove('active'));
		btn.classList.add('active');
		const targetId = btn.getAttribute('data-tab');
		helpTabContents.forEach(content => {
			if (content.id === targetId) content.classList.add('active');
			else content.classList.remove('active');
		});
	});
});

// --- 初期設定モーダル制御 ---
const globalSettingsBtn = document.getElementById('global-settings-btn');
const globalSettingsModalOverlay = document.getElementById('global-settings-modal-overlay');
const globalCloseSettingsBtn = document.getElementById('global-close-settings-btn');

globalSettingsBtn.addEventListener('click', () => {
	globalSettingsModalOverlay.classList.add('show');

	// 現在表示されているiframeに合わせてタブを切り替える
	const isCsvVisible = frameCsv.style.display !== 'none';

	helpTabBtns.forEach(b => b.classList.remove('active'));
	helpTabContents.forEach(c => c.classList.remove('active'));

	if (isCsvVisible) {
		const csvTabBtn = document.querySelector('.help-tab-btn[data-tab="help-csv"]');
		const csvTabContent = document.getElementById('help-csv');
		if (csvTabBtn) csvTabBtn.classList.add('active');
		if (csvTabContent) csvTabContent.classList.add('active');
	} else {
		const previewTabBtn = document.querySelector('.help-tab-btn[data-tab="help-preview"]');
		const previewTabContent = document.getElementById('help-preview');
		if (previewTabBtn) previewTabBtn.classList.add('active');
		if (previewTabContent) previewTabContent.classList.add('active');
	}
});
globalCloseSettingsBtn.addEventListener('click', () => { globalSettingsModalOverlay.classList.remove('show'); });
globalSettingsModalOverlay.addEventListener('click', (e) => { if (e.target === globalSettingsModalOverlay) globalSettingsModalOverlay.classList.remove('show'); });


// --- 設定の連携 (iframe への送信) ---
const folderNumCheck = document.getElementById('setting-folder-number');
const urlDomainCheck = document.getElementById('setting-url-domain');
const readmeHeadingSelect = document.getElementById('setting-readme-heading');

function sendSettingsToCsvFrame() {
	if (frameCsv && frameCsv.contentWindow) {
		frameCsv.contentWindow.postMessage({
			type: 'updateCsvSettings',
			settings: {
				useFolderNumber: folderNumCheck.checked,
				useUrlDomain: urlDomainCheck.checked,
				readmeHeadingStyle: readmeHeadingSelect.value
			}
		}, '*');
	}
}

// 値が変更されたら保存＆送信
if (folderNumCheck) folderNumCheck.addEventListener('change', () => { saveSettings(); sendSettingsToCsvFrame(); });
if (urlDomainCheck) urlDomainCheck.addEventListener('change', () => { saveSettings(); sendSettingsToCsvFrame(); });
if (readmeHeadingSelect) readmeHeadingSelect.addEventListener('change', () => { saveSettings(); sendSettingsToCsvFrame(); });

// iframe がロードされたら初期設定を送信
frameCsv.addEventListener('load', sendSettingsToCsvFrame);

// --- プレビュー設定の連携 (iframe への送信) ---
const readmeAutoCheck = document.getElementById('setting-readme-auto');
const readmeWidthInput = document.getElementById('setting-readme-width');
const readmeHeightInput = document.getElementById('setting-readme-height');
const readmeFontSizeInput = document.getElementById('setting-readme-font-size');
const readmeBgInput = document.getElementById('setting-readme-bg');
const readmeFontSelect = document.getElementById('setting-readme-font');
const resetReadmeBtn = document.getElementById('reset-readme-btn');

const alarmTimeInput = document.getElementById('setting-alarm-time');
const alarmVolInput = document.getElementById('setting-alarm-vol');
const alarmVolDisplay = document.getElementById('alarm-vol-display');
const testAlarmBtn = document.getElementById('test-alarm-btn');

function sendSettingsToPreviewFrame() {
	if (framePreview && framePreview.contentWindow) {
		framePreview.contentWindow.postMessage({
			type: 'updatePreviewSettings',
			settings: {
				readmeAuto: readmeAutoCheck.checked,
				readmeWidth: parseInt(readmeWidthInput.value) || 1024,
				readmeHeight: parseInt(readmeHeightInput.value) || 768,
				readmeFontSize: parseInt(readmeFontSizeInput.value) || 20,
				readmeBgColor: readmeBgInput.value,
				readmeFontFamily: readmeFontSelect.value,
				alarmTime: parseInt(alarmTimeInput.value) || 0,
				alarmVol: parseFloat(alarmVolInput.value) || 0.5
			}
		}, '*');
	}
}

function updateReadmeSizeInputsState() {
	if (readmeAutoCheck && readmeWidthInput && readmeHeightInput) {
		const isAuto = readmeAutoCheck.checked;
		readmeWidthInput.disabled = !isAuto;
		readmeHeightInput.disabled = !isAuto;

		const widthField = readmeWidthInput.closest('.tw-field');
		const heightField = readmeHeightInput.closest('.tw-field');
		if (widthField) widthField.style.opacity = isAuto ? '1' : '0.5';
		if (heightField) heightField.style.opacity = isAuto ? '1' : '0.5';
	}
}

// 値が変更されたら保存＆送信
if (readmeAutoCheck) {
	readmeAutoCheck.addEventListener('change', () => {
		updateReadmeSizeInputsState();
		saveSettings();
		sendSettingsToPreviewFrame();
	});
}
if (readmeWidthInput) readmeWidthInput.addEventListener('change', () => { saveSettings(); sendSettingsToPreviewFrame(); });
if (readmeHeightInput) readmeHeightInput.addEventListener('change', () => { saveSettings(); sendSettingsToPreviewFrame(); });
if (readmeFontSizeInput) readmeFontSizeInput.addEventListener('change', () => { saveSettings(); sendSettingsToPreviewFrame(); });
if (readmeBgInput) readmeBgInput.addEventListener('input', () => { saveSettings(); sendSettingsToPreviewFrame(); }); // inputだとリアルタイム反映
if (readmeFontSelect) readmeFontSelect.addEventListener('change', () => { saveSettings(); sendSettingsToPreviewFrame(); });
if (alarmTimeInput) alarmTimeInput.addEventListener('change', () => { saveSettings(); sendSettingsToPreviewFrame(); });
if (alarmVolInput) {
	alarmVolInput.addEventListener('input', () => {
		alarmVolDisplay.innerText = Math.round(alarmVolInput.value * 100) + '%';
		saveSettings();
		sendSettingsToPreviewFrame();
	});
}

// --- MP3によるアラーム再生処理 ---
let alarmAudio = new Audio('se/ani_ge_chicken_koke03.mp3');

function playRoosterVoice() {
	let masterVol = parseFloat(alarmVolInput.value) || 0.5;
	if (masterVol <= 0) return;

	// 再生位置を先頭に戻して音量を設定
	alarmAudio.currentTime = 0;
	alarmAudio.volume = masterVol;

	// 再生
	alarmAudio.play().catch(e => {
		console.error("音声の再生に失敗しました:", e);
	});
}

// テスト再生ボタン
if (testAlarmBtn) {
	testAlarmBtn.addEventListener('click', () => {
		playRoosterVoice();
	});
}

// 初期化ボタン
if (resetReadmeBtn) {
	resetReadmeBtn.addEventListener('click', () => {
		readmeAutoCheck.checked = true;
		readmeWidthInput.value = 1024;
		readmeHeightInput.value = 768;
		readmeFontSizeInput.value = 20;
		readmeBgInput.value = '#fdfbf7';
		readmeFontSelect.value = "'Sawarabi Gothic', sans-serif";
		updateReadmeSizeInputsState();
		saveSettings();
		sendSettingsToPreviewFrame();
	});
}

// iframe がロードされたら初期設定を送信
framePreview.addEventListener('load', sendSettingsToPreviewFrame);

// ページロード時の初期設定実行
document.addEventListener('DOMContentLoaded', () => {
	loadSettings();
	updateReadmeSizeInputsState();
});

lucide.createIcons();
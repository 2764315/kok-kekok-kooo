// --- CSV・フォルダ生成ロジック ---
const csvState = {
	csvData: [], headers: [], hiddenColumns: new Set(), filenameColumns: [],
	filenameOrder: [], currentIndex: 0, generatedFiles: [], deleteLogs: [],
	tags: [], categoryHistory: new Set(), deletedUrls: {},
	settings: {
		useFolderNumber: true,
		useUrlDomain: true,
		readmeHeadingStyle: 'hash'
	}
};

// 親フレーム(index.html)からの設定受信
window.addEventListener('message', (event) => {
	if (event.data && event.data.type === 'updateCsvSettings') {
		csvState.settings = event.data.settings;
		// 設定が変わったらプレビューを更新
		updateCsvPreview();
	}
});

const csvFileInput = document.getElementById('csv-file');

const csvRowSelect = document.getElementById('csv-row-select');
const csvPrevBtn = document.getElementById('csv-prev-btn');
const csvNextBtn = document.getElementById('csv-next-btn');
const csvTagInput = document.getElementById('csv-tag-input');
const csvColumnCheckboxes = document.getElementById('csv-column-checkboxes');
const csvFilenameCheckboxes = document.getElementById('csv-filename-checkboxes');
const csvPreviewContent = document.getElementById('csv-preview-content');
const csvPreviewFolderName = document.getElementById('csv-preview-folder-name');
const csvTreeContainer = document.getElementById('csv-tree-container');
const csvDownloadBtn = document.getElementById('csv-download-btn');
const csvControls = document.getElementById('csv-controls');
const csvDownloadArea = document.getElementById('csv-download-area');
const csvAccordionBtn = document.getElementById('csv-filename-accordion-btn');
const csvAccordionContent = document.getElementById('csv-filename-accordion-content');
const csvAccordionIcon = document.getElementById('csv-filename-accordion-icon');

csvAccordionBtn.addEventListener('click', () => {
	csvAccordionContent.classList.toggle('hidden');
	if (csvAccordionContent.classList.contains('hidden')) csvAccordionIcon.style.transform = 'rotate(0deg)';
	else csvAccordionIcon.style.transform = 'rotate(180deg)';
});

// ファイル読み込み処理
csvFileInput.addEventListener('change', (e) => {
	const file = e.target.files[0];
	if (!file) return;
	Papa.parse(file, {
		header: true, skipEmptyLines: true,
		complete: (results) => {
			csvState.csvData = results.data;
			csvState.headers = results.meta.fields || [];
			csvState.filenameOrder = [...csvState.headers];
			csvState.hiddenColumns.clear();
			csvState.deleteLogs = [];
			csvState.tags = new Array(results.data.length).fill("");
			csvState.deletedUrls = {};
			csvState.categoryHistory.clear();

			csvState.headers.forEach(h => {
				if (h.includes('タイムスタンプ') || h.includes('連絡先')) csvState.hiddenColumns.add(h);
			});
			const titleCol = csvState.headers.find(h => h.includes('タイトル'));
			if (titleCol) csvState.filenameColumns = [titleCol];
			else if (csvState.headers.length > 0) csvState.filenameColumns = [csvState.headers[0]];
			else csvState.filenameColumns = [];
			csvState.currentIndex = 0;

			if (csvState.csvData.length > 0) {
				csvControls.classList.remove('hidden');
				csvDownloadArea.classList.remove('hidden');
				const hint = document.getElementById('csv-empty-hint');
				if (hint) hint.style.display = 'none';

				renderCsvCheckboxes();
				updateCategoryHistory();
				updateCsvRowSelect();
				updateCsvPreview();
			}
		}
	});
});

csvPrevBtn.addEventListener('click', () => {
	if (csvState.currentIndex > 0) { csvState.currentIndex--; csvRowSelect.value = csvState.currentIndex; updateCsvPreview(); }
});
csvNextBtn.addEventListener('click', () => {
	if (csvState.currentIndex < csvState.csvData.length - 1) { csvState.currentIndex++; csvRowSelect.value = csvState.currentIndex; updateCsvPreview(); }
});

// カテゴリ設定の更新と履歴整理
function updateCategoryHistory() {
	const activeTags = csvState.tags.filter(t => t && t.trim() !== "");
	csvState.categoryHistory = new Set(activeTags);
	renderCategoryHistory();
}

// カテゴリ設定（入力）イベント
csvTagInput.addEventListener('change', (e) => {
	const val = e.target.value.trim();
	csvState.tags[csvState.currentIndex] = val;
	updateCategoryHistory();
	updateCsvRowSelect();
	updateCsvPreview();
});

// カテゴリ履歴の描画
function renderCategoryHistory() {
	const container = document.getElementById('category-history-container');
	container.innerHTML = '';
	csvState.categoryHistory.forEach(cat => {
		const span = document.createElement('span');
		span.textContent = cat;
		span.style.cssText = "font-size: 11px; padding: 4px 10px; background-color: #e0f2ec; color: #007b5e; border-radius: 12px; cursor: pointer; border: 1px solid #b0d4c8; transition: all 0.2s;";
		span.onmouseover = () => { span.style.backgroundColor = '#A7E0CF'; };
		span.onmouseout = () => { span.style.backgroundColor = '#e0f2ec'; };
		span.addEventListener('click', () => {
			csvTagInput.value = cat;
			csvState.tags[csvState.currentIndex] = cat;
			updateCategoryHistory();
			updateCsvRowSelect();
			updateCsvPreview();
		});
		container.appendChild(span);
	});
}

function renderCsvCheckboxes() {
	csvColumnCheckboxes.innerHTML = csvState.headers.map(col => {
		const isHidden = csvState.hiddenColumns.has(col);
		const btnClass = isHidden ? 'csv-check-item-hidden' : 'csv-check-item-default';
		const icon = isHidden ? 'eye-off' : 'eye';
		const textStyle = isHidden ? 'text-decoration: line-through;' : '';
		return `
					<label class="csv-check-item ${btnClass}">
						<span style="${textStyle}">${col}</span>
						<i data-lucide="${icon}" style="width:16px; height:16px;"></i>
						<input type="checkbox" value="${col}" class="csv-hidden-cb hidden" ${isHidden ? 'checked' : ''}>
					</label>
				`;
	}).join('');

	csvFilenameCheckboxes.innerHTML = csvState.filenameOrder.map((col, index) => {
		const isChecked = csvState.filenameColumns.includes(col);
		const btnClass = isChecked ? 'csv-check-item-active' : 'csv-check-item-default';
		const icon = isChecked ? 'check-circle-2' : 'circle';
		return `
					<label draggable="true" data-index="${index}" class="csv-check-item csv-drag-item ${btnClass}">
						<div style="display:flex; align-items:center; gap:8px;">
							<i data-lucide="grip-vertical" style="width:14px; height:14px; color:#999;"></i>
							<span>${col}</span>
						</div>
						<i data-lucide="${icon}" style="width:16px; height:16px;"></i>
						<input type="checkbox" value="${col}" class="csv-filename-cb hidden" ${isChecked ? 'checked' : ''}>
					</label>
				`;
	}).join('');

	lucide.createIcons({ root: csvColumnCheckboxes });
	lucide.createIcons({ root: csvFilenameCheckboxes });
	attachCsvCheckboxEvents(); attachCsvDragAndDropEvents();
}

function attachCsvCheckboxEvents() {
	document.querySelectorAll('.csv-hidden-cb').forEach(cb => {
		cb.addEventListener('change', (e) => {
			if (e.target.checked) csvState.hiddenColumns.add(e.target.value);
			else csvState.hiddenColumns.delete(e.target.value);
			renderCsvCheckboxes(); updateCsvPreview();
		});
	});
	document.querySelectorAll('.csv-filename-cb').forEach(cb => {
		cb.addEventListener('change', (e) => {
			const val = e.target.value;
			if (e.target.checked) csvState.filenameColumns.push(val);
			else csvState.filenameColumns = csvState.filenameColumns.filter(c => c !== val);
			csvState.filenameColumns.sort((a, b) => csvState.filenameOrder.indexOf(a) - csvState.filenameOrder.indexOf(b));
			renderCsvCheckboxes(); updateCsvRowSelect(); updateCsvPreview();
		});
	});
}

function attachCsvDragAndDropEvents() {
	let dragStartIndex = null;
	const items = document.querySelectorAll('.csv-drag-item');
	items.forEach(item => {
		item.addEventListener('dragstart', (e) => {
			dragStartIndex = parseInt(item.getAttribute('data-index'));
			e.dataTransfer.effectAllowed = 'move';
			setTimeout(() => item.style.opacity = '0.5', 0);
		});
		item.addEventListener('dragend', () => { item.style.opacity = '1'; dragStartIndex = null; });
		item.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; });
		item.addEventListener('drop', (e) => {
			e.preventDefault(); const dropElement = e.target.closest('.csv-drag-item');
			if (!dropElement) return;
			const dragEndIndex = parseInt(dropElement.getAttribute('data-index'));
			if (dragStartIndex !== null && dragStartIndex !== dragEndIndex) {
				const movedItem = csvState.filenameOrder.splice(dragStartIndex, 1)[0];
				csvState.filenameOrder.splice(dragEndIndex, 0, movedItem);
				csvState.filenameColumns.sort((a, b) => csvState.filenameOrder.indexOf(a) - csvState.filenameOrder.indexOf(b));
				renderCsvCheckboxes(); updateCsvRowSelect(); updateCsvPreview();
			}
		});
	});
}

function updateCsvRowSelect() {
	csvRowSelect.innerHTML = csvState.csvData.map((row, i) => {
		let title = generateCsvFolderName(row);
		if (title.length > 15) title = title.substring(0, 15) + '...';
		const tag = csvState.tags[i] || "";
		const folderPrefix = tag ? `【${tag}】` : "";
		return `<option value="${i}">${folderPrefix}${String(i + 1).padStart(3, '0')} - ${title}</option>`;
	}).join('');
	csvRowSelect.value = csvState.currentIndex;
	csvRowSelect.onchange = (e) => { csvState.currentIndex = Number(e.target.value); updateCsvPreview(); };
}

function generateCsvFolderName(row) {
	const parts = csvState.filenameColumns.map(col => row[col]).filter(Boolean);
	return parts.length > 0 ? parts.join('-') : 'データ';
}

function processCsvTextAndExtractUrls(text, startIndex) {
	if (typeof text !== 'string') return { text, urls: [], nextIndex: startIndex };
	const urlRegex = /(https?:\/\/[^\s]+)/g;
	const urls = []; let currentCount = startIndex;
	const replacedText = text.replace(urlRegex, (match) => {
		const cleanUrl = match.replace(/,+$/, ''); const trailing = match.substring(cleanUrl.length);
		let domainStr = 'unknown';
		try { const urlObj = new URL(cleanUrl); domainStr = urlObj.hostname.replace(/\./g, '-'); } catch (e) { }
		const urlId = csvState.settings.useUrlDomain
			? `URL-${String(currentCount).padStart(2, '0')}__${domainStr}`
			: `URL-${String(currentCount).padStart(2, '0')}`;
		urls.push({ id: urlId, url: cleanUrl }); currentCount++;
		return `[${urlId}]${trailing}`;
	});
	return { text: replacedText, urls, nextIndex: currentCount };
}

function formatCsvRowData(row) {
	let infoText = ""; let extractedUrls = []; let globalUrlCount = 1;
	csvState.headers.forEach(header => {
		const { text, urls, nextIndex } = processCsvTextAndExtractUrls(row[header], globalUrlCount);
		extractedUrls = [...extractedUrls, ...urls]; globalUrlCount = nextIndex;
		if (!csvState.hiddenColumns.has(header)) {
			let headingText = "";
			switch (csvState.settings.readmeHeadingStyle) {
				case 'bracket': headingText = `【${header}】\n`; break;
				case 'line': headingText = `―― ${header} ――\n`; break;
				case 'none': headingText = `${header}\n`; break;
				case 'hash':
				default: headingText = `# ${header}\n`; break;
			}
			infoText += `${headingText}${text}\n\n`;
		}
	});
	return { infoText, extractedUrls };
}

function attachCsvTreeClickEvents(folderPath) {
	const treeItems = csvTreeContainer.querySelectorAll('.csv-tree-item');
	treeItems.forEach(item => {
		item.addEventListener('click', () => {
			treeItems.forEach(el => el.classList.remove('active')); item.classList.add('active');
			const fileIndex = parseInt(item.getAttribute('data-index'));
			const fileData = csvState.generatedFiles[fileIndex];
			updateCsvPreviewContent(fileData);
		});
	});
}

function updateCsvPreviewContent(fileData) {
	if (fileData.isUrl) {
		csvPreviewContent.innerHTML = `<a href="${fileData.content}" target="_blank" rel="noopener noreferrer" style="color: #007b5e; text-decoration: underline; word-break: break-all;">${fileData.content}</a>`;
	} else {
		csvPreviewContent.textContent = fileData.content;
	}
}

function updateCsvPreview() {
	if (csvState.csvData.length === 0) return;
	const row = csvState.csvData[csvState.currentIndex];
	const { infoText, extractedUrls } = formatCsvRowData(row);
	const formattedRowNum = String(csvState.currentIndex + 1).padStart(3, '0');
	const folderTitle = generateCsvFolderName(row);
	const safeTitle = folderTitle.replace(/[\\/:*?"<>|]/g, '_');

	// カテゴリの反映
	const tag = csvState.tags[csvState.currentIndex] || "";
	const folderPrefix = tag ? `【${tag}】` : "";
	const numberPrefix = csvState.settings.useFolderNumber ? `${formattedRowNum}-` : "";
	const folderPath = `${folderPrefix}${numberPrefix}${safeTitle}`;

	if (document.activeElement !== csvTagInput) {
		csvTagInput.value = tag;
	}

	// 削除されたURLの処理
	const deleted = csvState.deletedUrls[csvState.currentIndex] || [];
	let readmeContent = infoText.trim();
	deleted.forEach(delId => {
		const targetStr = `[${delId}]`;
		readmeContent = readmeContent.split(targetStr).join('[—検閲済み—]');
	});

	csvState.generatedFiles = [];
	csvState.generatedFiles.push({ id: 'readme', name: `README-${safeTitle}.txt`, content: readmeContent, isUrl: false });
	extractedUrls.forEach(urlObj => {
		if (!deleted.includes(urlObj.id)) {
			csvState.generatedFiles.push({ id: urlObj.id, name: `${urlObj.id}.txt`, content: urlObj.url, isUrl: true });
		}
	});

	updateCsvPreviewContent(csvState.generatedFiles[0]);
	csvPreviewFolderName.textContent = `${folderPath}`;

	let treeHtml = `
				<div style="font-weight:bold; color:#333; margin-bottom:8px; display:flex; align-items:flex-start; gap:6px;">
					<i data-lucide="folder" style="width:16px; height:16px; color:#007b5e; margin-top:2px;"></i>
					<span style="flex-grow:1; word-break:break-all; line-height:1.4;">${folderPath}</span>
					<button id="dynamic-csv-delete-btn" class="csv-folder-delete-btn" title="この回答を丸ごと削除">
						<i data-lucide="trash-2" style="width:16px; height:16px; color:#999; transition: color 0.2s;"></i>
					</button>
				</div>
				<div style="padding-left:12px;">`;

	const sharedDomains = ['gigafile.nu', 'gigafile.jp', 'datadeliver.net', 'dtbn.jp', 'firestorage.jp', 'xfs.jp', 'xgf.nu', 'tenpu.me', 'ac-data.info', 'okurin.bitpark.co.jp', 'delifile.link'];
	let hasSharedLink = false;

	csvState.generatedFiles.forEach((file, index) => {
		const activeClass = index === 0 ? 'active' : '';
		let iconColor = "";
		if (file.isUrl) {
			const isShared = sharedDomains.some(domain => file.content.includes(domain));
			if (isShared) {
				iconColor = 'color: #e74c3c;';
				hasSharedLink = true;
			}
		}

		let deleteFileBtn = '';
		if (file.isUrl) {
			deleteFileBtn = `
					<button class="csv-file-delete-btn" data-file-id="${file.id}" data-file-url="${file.content}" title="このファイルを削除">
						<i data-lucide="trash-2" style="width:14px; height:14px; color:#999; transition: color 0.2s;"></i>
					</button>`;
		}

		treeHtml += `<div class="csv-tree-item ${activeClass}" data-index="${index}" style="width: 100%;">
								<i data-lucide="file-text" style="width:14px; height:14px; ${iconColor}"></i>
								<span style="flex-grow:1; overflow:hidden; text-overflow:ellipsis;">${file.name}</span>
								${deleteFileBtn}
							</div>`;
	});
	treeHtml += `</div>`;

	if (hasSharedLink) {
		treeHtml += `<p style="font-size: 11px; color: #e74c3c; margin: 10px 0 0 0; line-height: 1.4;"><i data-lucide="alert-triangle" style="width:12px; height:12px; margin-right: 2px;"></i>ダウンロード用URLの可能性があります。以下の手順をお試しください。1.URLからファイルをダウンロードする 2.URL.txtファイルを削除する 3.ZIPファイルをダウンロードし解凍する 4.フォルダにダウンロードしたファイルを保存する 5.データプレビュー(配信用機能)で読み込む</p>`;
	}

	csvTreeContainer.innerHTML = treeHtml;
	lucide.createIcons({ root: csvTreeContainer });
	attachCsvTreeClickEvents(folderPath);

	// 回答ごとの削除ボタン（フォルダ横）
	const dynamicDeleteBtn = document.getElementById('dynamic-csv-delete-btn');
	if (dynamicDeleteBtn) {
		dynamicDeleteBtn.addEventListener('click', (e) => {
			e.stopPropagation();
			if (csvState.csvData.length === 0) return;
			if (confirm('この回答を削除しますか？\n（元のCSVファイル自体は変更されません。削除した内容は、LOG.txtとしてZIPファイルに記録されます）')) {
				const row = csvState.csvData[csvState.currentIndex];
				const now = new Date();
				const timeStr = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
				const rowValues = Object.values(row).join(', ');

				csvState.deleteLogs.push(`[${timeStr}] フォルダ削除: ${folderPath}\n内容: ${rowValues}\n`);

				csvState.csvData.splice(csvState.currentIndex, 1);
				csvState.tags.splice(csvState.currentIndex, 1);

				const newDeletedUrls = {};
				for (const key in csvState.deletedUrls) {
					const k = parseInt(key);
					if (k < csvState.currentIndex) newDeletedUrls[k] = csvState.deletedUrls[k];
					else if (k > csvState.currentIndex) newDeletedUrls[k - 1] = csvState.deletedUrls[k];
				}
				csvState.deletedUrls = newDeletedUrls;

				if (csvState.csvData.length === 0) {
					// 全て削除された場合は初期状態に戻す
					csvControls.classList.add('hidden');
					csvDownloadArea.classList.add('hidden');
					document.getElementById('csv-empty-hint').style.display = 'block';
					csvPreviewFolderName.textContent = '未選択';
					csvPreviewContent.textContent = '左側のメニューからCSVファイルをアップロードしてください';
					csvTreeContainer.innerHTML = 'CSVアップロード後に表示されます';
					csvTagInput.value = "";
					csvState.categoryHistory.clear();
					renderCategoryHistory();
				} else {
					if (csvState.currentIndex >= csvState.csvData.length) {
						csvState.currentIndex = csvState.csvData.length - 1;
					}
					updateCategoryHistory();
					updateCsvRowSelect();
					updateCsvPreview();
				}
			}
		});
	}

	// URLごとの個別削除ボタン
	document.querySelectorAll('.csv-file-delete-btn').forEach(btn => {
		btn.addEventListener('click', (e) => {
			e.stopPropagation();
			if (confirm('このURLファイルを削除しますか？\n（README内の該当箇所は [—検閲済み—] と表記されます。削除した内容は、LOG.txtとしてZIPファイルに記録されます。）')) {
				const fileId = e.currentTarget.getAttribute('data-file-id');
				const fileUrl = e.currentTarget.getAttribute('data-file-url');

				if (!csvState.deletedUrls[csvState.currentIndex]) {
					csvState.deletedUrls[csvState.currentIndex] = [];
				}
				csvState.deletedUrls[csvState.currentIndex].push(fileId);

				const now = new Date();
				const timeStr = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
				csvState.deleteLogs.push(`[${timeStr}] ファイル削除: ${fileUrl} (対象フォルダ: ${folderPath})\n`);

				updateCsvPreview();
			}
		});
	});
}

csvDownloadBtn.addEventListener('click', async () => {
	if (csvState.csvData.length === 0) return;
	const zip = new JSZip();
	csvState.csvData.forEach((row, index) => {
		const { infoText, extractedUrls } = formatCsvRowData(row);
		const formattedRowNum = String(index + 1).padStart(3, '0');
		const folderTitle = generateCsvFolderName(row);
		const safeTitle = folderTitle.replace(/[\\/:*?"<>|]/g, '_');

		const tag = csvState.tags[index] || "";
		const folderPrefix = tag ? `【${tag}】` : "";
		const numberPrefix = csvState.settings.useFolderNumber ? `${formattedRowNum}-` : "";
		const folderName = `${folderPrefix}${numberPrefix}${safeTitle}`;

		const folder = zip.folder(folderName);

		const deleted = csvState.deletedUrls[index] || [];
		let readmeContent = infoText.trim();
		deleted.forEach(delId => {
			const targetStr = `[${delId}]`;
			readmeContent = readmeContent.split(targetStr).join('[—検閲済み—]');
		});

		folder.file(`README-${safeTitle}.txt`, readmeContent);
		extractedUrls.forEach(urlObj => {
			if (!deleted.includes(urlObj.id)) {
				folder.file(`${urlObj.id}.txt`, urlObj.url);
			}
		});
	});

	if (csvState.deleteLogs.length > 0) {
		zip.file("LOG.txt", "=== 削除ログ ===\n" + csvState.deleteLogs.join('\n'));
	}

	const now = new Date();
	const mm = String(now.getMonth() + 1).padStart(2, '0');
	const dd = String(now.getDate()).padStart(2, '0');
	const hh = String(now.getHours()).padStart(2, '0');
	const min = String(now.getMinutes()).padStart(2, '0');
	const ss = String(now.getSeconds()).padStart(2, '0');
	const zipFileName = `ｺｯｹｺｯｺｰ!!!_${mm}${dd}${hh}${min}${ss}.zip`;

	const content = await zip.generateAsync({ type: 'blob' });
	saveAs(content, zipFileName);
});

lucide.createIcons();
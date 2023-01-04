
async function makeList(listData, listId) {
	/* @brief makes ul list in html with elements from listData array.
	 * @param: listData - list elements
	 * 		   listId - id for creating list name
	 */
    let listContainer = document.createElement('div');
    let listElement = document.createElement('ul');
    listElement.textContent = "#" + listId;
    listElement.setAttribute("class", "searchResult");
    let listItem = document.createElement('li');
    document.body.appendChild(listContainer);
    listContainer.appendChild(listElement);
    let numberOfListItems = listData.length;

    for (let i = 0; i < numberOfListItems; ++i) {
        listItem.textContent = listData[i];
        listElement.appendChild(listItem);
        listItem = document.createElement('li');
    }
}


async function isSame(img1, img2) {
	/* @brief: check if two images are the same.
	 * 		   checks it`s byte arrays.
	 * @return: true if same, otherwise false
	 *
	 * //TODO - check array difference with help of bit operations.
	 */
	let len = img1.byteLength > img2.byteLength ? img1.byteLength : img2.byteLength;
	for (let i=0; i<len; i++) {
		if (img1[i] != img2[i]) {
			return false;
		}
	}
	return true;
}

async function getFileEntries(dirHandle, fileEntries, dirName) {
	/* @brief: gets all file entries in dirHandle. If user selected checkbox
	 *			for recursive search - all files in subdirectories will also be checked.
	 * @return: object {"name": filename, "enrty": fileEntry}
	 *			object["name"] - it is path to file. 
	 */
	const isRecursiveSerach = document.querySelector('.recursiveFind').checked;
	for await (const entry of dirHandle.values()) {
		if (entry.kind === "file" && entry.name[0] !== ".") {
			let name = dirName + entry.name;
			fileEntries.push({entry: entry, name: name});
		}
		else if (entry.kind === "directory" && isRecursiveSerach && entry.name[0] !== ".") {
			const newHandle = await dirHandle.getDirectoryHandle( entry.name, { create: false } );
			let path = dirName + entry.name + "/";
			getFileEntries(newHandle, fileEntries, path);
		}
	}
	return fileEntries;
}

async function getImageDataFromFileEntry(fileEntries) {
	/* @brief: gets data about image from file entries.
	 * @return: array of image data sorted by size.
	 * 			imageы = {size: ["img_name": file_entry, "img_name1": file_enrty1], 
	 *					 size: ["img_name": file_entry, "img_name1": file_enrty1]}
	 */
	const promisifiedReader = function(file) {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.readAsArrayBuffer(file);
			reader.addEventListener('error', () => {
				console.error(`Error occurred reading file: ${entry.name}`);
			});
			reader.onload = () => {resolve(reader.result);}
		});
	}
	let images = {};
	for (const elem of fileEntries) {
		const fileData = await elem["entry"].getFile();
		let file = await promisifiedReader(fileData);
		if (images[file.byteLength] == undefined) {
			images[file.byteLength] = [];
		}
		let fname = elem.name;
		images[file.byteLength].push({"name": fname, "rawData": file});
	}
	return images;
}


async function getDuplicates(images) {
	let duplicates = [];
	for (let imgSizeGroup in images) {
		for (let imgIndex1=0; imgIndex1<images[imgSizeGroup].length; imgIndex1++) {
			for (let imgIndex2=imgIndex1+1; imgIndex2<images[imgSizeGroup].length; imgIndex2++) {
				let img_a = images[imgSizeGroup][imgIndex1];
				let img_b = images[imgSizeGroup][imgIndex2];
				if (isSame(img_a["rawData"],img_b["rawData"])) {
					let continueFlag = false;
					for (let arr of duplicates) {
						if (arr.includes(img_a["name"]) && arr.includes(img_b["name"])) {
							continueFlag = true;
						}
						else if (arr.includes(img_a["name"]))  {
							arr.push(img_b["name"]);
							continueFlag = true;
						}
						else if (arr.includes(img_b["name"]))  {
							arr.push(img_a["name"]);
							continueFlag = true;
						}
					}
					if (continueFlag) {
						continue;
					}
					duplicates.push([img_a["name"], img_b["name"]]);
				}
			}
		}
	}
	return duplicates;
}

function createText(text, id) {
	let msgContainer = document.createElement('div');
    let innerText = document.createElement('p');
	innerText.textContent = text;
	innerText.setAttribute("class", id);
	document.body.appendChild(msgContainer);
	msgContainer.appendChild(innerText);
}

async function showDuplicates(duplicates) {
	/* @brief: show found duplicates.
	 */
	await refreshPage();
	if (duplicates.length == 0) {
		createText("No duplicates found!", "searchResult");
	}
	else {
		for (let id in duplicates) {
			await makeList(duplicates[id], +id + 1);
		}
	}
}

async function refreshPage() {
	/* @brief: deletes all unneeded elements from page.
	 */
	let searchResultList = document.getElementsByClassName("searchResult");
	if (searchResultList.length > 0) {
		while(searchResultList.length != 0) {
			searchResultList[0].remove();
		}
	}
}

async function samePhotosFinder() {
	/* @brief: finds visually same photos in user-specified directory.
	 * 		if user added `recursive` checkbox, 
	 *		 then all subdirectories will be also checked.
	 *		1. Call user to select directory to check for duplicates.
	 * 			User will be also called from browser to give permissions.
	 *		2. get all images(fileEntries) from user-specified directory. 
	 *		3. parse and sort by size images(fileEntries) in object.
	 *		4. find duplicates
	 *		5. show result.
	 */
	await refreshPage();
	const dirHandle = await window.showDirectoryPicker();
	let fileEntries = await getFileEntries(dirHandle, [], "./");;
	let images = await getImageDataFromFileEntry(fileEntries);
	let duplicates = await getDuplicates(images);
	await showDuplicates(duplicates);
}

async function entryPoint() {
	/* @brief: entry point to same photos finder.
	 *		   if file system api does not supperted -> error msg called.
	 */
	if (window.File && window.FileReader && window.FileList && window.Blob) {
		await samePhotosFinder();
	} 
	else {
		alert('File System API is not supported by your browser...');
	}
}

// Client-side seller panel. Server actions are intentionally left for the seller's Apps Script.
// Expected actions: getSellerName, listBooks, add, update, delete, getProfile, updateProfile.
// update/delete requests include EmailAddress so Apps Script can scope changes across all matching sheets.
const scriptURL = 'https://script.google.com/macros/s/AKfycbzhZwemQwZ9BMblZ3Gp0f_XkT0iR3yjXNlvPqwyDSFdkfY-Sossj1OlAdBE-glwEO3m/exec';
let currentMode = 'add';
let selectedBook = null;
let uploadedImageData = '';

const datasets = {
    English: {
        genres: ['Novel','Fiction','Science Fiction','Biography','History','Mystery','Poetry','Children','Fantasy','Romance','Education'],
        publishers: ['Penguin Books','HarperCollins','Oxford University Press','Random House','Macmillan']
    },
    Bengali: {
        genres: ['উপন্যাস','নাটক','কবিতা','ছোটগল্প','রহস্য','ইতিহাস','শিশুসাহিত্য','কল্পবিজ্ঞান','রোমান্স','শিক্ষা'],
        publishers: ['আনন্দ পাবলিশার্স','দে’জ পাবলিশিং','পত্রভারতী','সাহিত্য সংসদ','দেজ পাবলিশিং']
    }
};

const copy = {
    English: {panel:'Readora Seller Panel',intro:'Add new books or securely modify/delete your existing listings.',profile:'Edit profile',add:'Add New Book',edit:'Edit / Modify',delete:'Delete Book',language:'Language',category:'Category (Genre)',publisher:'Publishers',title:'Book Title',author:'Author',image:'Image URL',upload:'Or upload',description:'Description (Max 150 words)',yourBooks:'Your Books',booksHelp:'Books are fetched from the spreadsheet for this seller email.',refresh:'Refresh books',profileTitle:'Edit Seller Profile',saveProfile:'Save Profile',name:'Seller Name',phone:'Phone',business:'Business / shop name',address:'Address',remove:'Remove',addBook:'Add Book to Spreadsheet',updateBook:'Save Book Changes',chooseLanguage:'Please select a language first.',mismatch:'The book title, author, or description does not match the selected language. Please correct the writing system before submitting.',invalidEmail:'Enter a valid seller email first.',loading:'Loading books…',empty:'No books found for this seller.',fetchError:'Could not fetch books. The Apps Script endpoint needs a listBooks action.',deleteConfirm:'Delete this book from all matching seller sheets? This cannot be undone.',added:'Book submitted.',updated:'Book updated.',deleted:'Book deleted from matching sheets.',profileSaved:'Seller profile updated.',profileError:'Could not load profile details.',imageError:'Choose an image smaller than 5 MB.',wordLimit:'Description must be no more than 150 words.',enterEmail:'Enter your seller email to fetch your books.',editAction:'Edit book',deleteAction:'Delete book'},
    Bengali: {panel:'রিডোরা বিক্রেতা প্যানেল',intro:'নতুন বই যোগ করুন অথবা আপনার বইয়ের তালিকা সম্পাদনা ও মুছুন।',profile:'প্রোফাইল সম্পাদনা',add:'নতুন বই যোগ',edit:'বই সম্পাদনা',delete:'বই মুছুন',language:'ভাষা',category:'বিভাগ',publisher:'প্রকাশক',title:'বইয়ের নাম',author:'লেখক',image:'ছবির URL',upload:'অথবা আপলোড',description:'বিবরণ (সর্বোচ্চ ১৫০ শব্দ)',yourBooks:'আপনার বই',booksHelp:'এই বিক্রেতার ইমেল অনুযায়ী স্প্রেডশিট থেকে বই দেখানো হবে।',refresh:'বই আবার লোড',profileTitle:'বিক্রেতার প্রোফাইল সম্পাদনা',saveProfile:'প্রোফাইল সংরক্ষণ',name:'বিক্রেতার নাম',phone:'ফোন',business:'দোকান বা প্রতিষ্ঠানের নাম',address:'ঠিকানা',remove:'সরান',addBook:'স্প্রেডশিটে বই যোগ',updateBook:'পরিবর্তন সংরক্ষণ',chooseLanguage:'আগে ভাষা নির্বাচন করুন।',mismatch:'বইয়ের নাম, লেখক বা বিবরণের ভাষা নির্বাচিত ভাষার সঙ্গে মিলছে না। জমা দেওয়ার আগে লেখাটি ঠিক করুন।',invalidEmail:'আগে সঠিক বিক্রেতার ইমেল লিখুন।',loading:'বই লোড হচ্ছে…',empty:'এই বিক্রেতার কোনো বই পাওয়া যায়নি।',fetchError:'বই আনা যায়নি। Apps Script endpoint-এ listBooks action যোগ করতে হবে।',deleteConfirm:'সব মিলে যাওয়া বিক্রেতা শিট থেকে এই বইটি মুছবেন? এটি ফিরিয়ে আনা যাবে না।',added:'বই জমা হয়েছে।',updated:'বই আপডেট হয়েছে।',deleted:'মিলে যাওয়া শিট থেকে বইটি মুছে ফেলা হয়েছে।',profileSaved:'বিক্রেতার প্রোফাইল আপডেট হয়েছে।',profileError:'প্রোফাইলের তথ্য আনা যায়নি।',imageError:'৫ MB-এর ছোট ছবি বেছে নিন।',wordLimit:'বিবরণ ১৫০ শব্দের বেশি হতে পারবে না।',enterEmail:'বই আনতে বিক্রেতার ইমেল লিখুন।',editAction:'বই সম্পাদনা',deleteAction:'বই মুছুন'}
};

const $ = id => document.getElementById(id);
const form = $('bookForm');
const emailField = $('EmailAddress');
const languageField = $('languageSelect');

function lang() { return languageField.value === 'Bengali' ? 'Bengali' : 'English'; }
function text(key) { return copy[lang()][key] || key; }
function message(value, type) {
    const el = $('status-message');
    el.textContent = value;
    el.className = 'status-message visible ' + (type || 'info');
}
function clearMessage() { $('status-message').className = 'status-message'; }
function applyLanguage() {
    const bengali = lang() === 'Bengali';
    document.body.classList.toggle('lang-bengali', bengali);
    const labels = {
        panelTitle:'panel', panelIntro:'intro', editProfileLabel:'profile', addModeLabel:'add', editModeLabel:'edit', deleteModeLabel:'delete',
        languageLabel:'language', categoryLabel:'category', publisherLabel:'publisher', bookTitleLabel:'title', authorLabel:'author',
        imageLabel:'image', uploadLabel:'upload', descriptionLabel:'description', booksHeading:'yourBooks', booksHelp:'booksHelp',
        reloadBooks:'refresh', profileHeading:'profileTitle'
    };
    Object.keys(labels).forEach(id => { const el=$(id); if(el) el.textContent=text(labels[id]); });
    $('bookTitle').placeholder = bengali ? 'বইয়ের নাম লিখুন' : 'Enter book title';
    $('authorName').placeholder = bengali ? 'লেখকের নাম লিখুন' : 'Author name';
    $('descriptionField').placeholder = bengali ? 'নির্বাচিত ভাষায় বিবরণ লিখুন' : 'Write description in the selected language';
    $('categorySearch').placeholder = bengali ? 'বিভাগ খুঁজুন…' : 'Type to search genre…';
    $('publisherSearch').placeholder = bengali ? 'প্রকাশক খুঁজুন…' : 'Type to search publisher…';
    languageField.options[0].textContent = bengali ? 'ভাষা নির্বাচন করুন' : 'Select Language';
    const condition = form.elements.namedItem('Condition');
    condition.options[0].textContent = bengali ? 'নতুন' : 'New';
    condition.options[1].textContent = bengali ? 'পুরোনো' : 'Old';
    const status = form.elements.namedItem('Status');
    status.options[0].textContent = bengali ? 'নতুন আগমন' : 'New Arrival';
    status.options[1].textContent = bengali ? 'সর্বাধিক বিক্রিত' : 'Best Selling';
    status.options[2].textContent = bengali ? 'উভয়' : 'Both';
    $('clearImage').textContent = text('remove');
    const fields = {
        panelTitle:'panel', panelIntro:'intro', editProfileLabel:'profile', addModeLabel:'add', editModeLabel:'edit', deleteModeLabel:'delete',
        languageLabel:'language', categoryLabel:'category', publisherLabel:'publisher', bookTitleLabel:'title', authorLabel:'author',
        imageLabel:'image', uploadLabel:'upload', descriptionLabel:'description', booksHeading:'yourBooks', booksHelp:'booksHelp',
        reloadBooks:'refresh', profileHeading:'profileTitle', saveProfile:'saveProfile'
    };
    Object.keys(fields).forEach(id => { const el=$(id); if(el) el.textContent=text(fields[id]); });
    $('categorySearch').placeholder = bengali ? 'বিভাগ খুঁজুন…' : 'Type to search genre…';
    $('publisherSearch').placeholder = bengali ? 'প্রকাশক খুঁজুন…' : 'Type to search publisher…';
    $('bookTitle').placeholder = bengali ? 'বইয়ের নাম লিখুন' : 'Enter book title';
    $('authorName').placeholder = bengali ? 'লেখকের নাম লিখুন' : 'Author name';
    $('descriptionField').placeholder = bengali ? 'নির্বাচিত ভাষায় বিবরণ লিখুন' : 'Write the description in the selected language';
    document.querySelectorAll('.dropdown-trigger').forEach((btn,i)=>btn.setAttribute('aria-label',bengali?(i===0?'বিভাগ দেখান':'প্রকাশক দেখান'):(i===0?'Show categories':'Show publishers')));
    $('submitBtn').innerHTML = '<i class="fa-solid fa-paper-plane"></i> ' + (currentMode==='edit'?text('updateBook'):text('addBook'));
    if (selectedBook) $('clearImage').textContent=text('remove');
}
function handleLanguageChange() {
    $('categorySearch').value=''; $('CategoryValue').value='';
    $('publisherSearch').value=''; $('PublisherValue').value='';
    document.querySelectorAll('.dropdown-list').forEach(el=>el.style.display='none');
    applyLanguage();
}

function toggleDropdown(type) {
    const list=$(type+'Dropdown');
    if(list.style.display==='block') list.style.display='none';
    else filterDropdown(type,true);
}
function filterDropdown(type, showAll=false) {
    if(!languageField.value) { message(text('chooseLanguage'),'info'); return; }
    const input=$(type+'Search'), list=$(type+'Dropdown');
    const options=datasets[languageField.value][type==='category'?'genres':'publishers'];
    const query=input.value.toLocaleLowerCase(languageField.value==='Bengali'?'bn':'en');
    const values=options.filter(value=>showAll||!query||value.toLocaleLowerCase(languageField.value==='Bengali'?'bn':'en').includes(query));
    list.replaceChildren();
    values.forEach(value=>{
        const item=document.createElement('div'); item.className='dropdown-item'; item.textContent=value;
        item.addEventListener('click',()=>{input.value=value;$(type==='category'?'CategoryValue':'PublisherValue').value=value;list.style.display='none';});
        list.appendChild(item);
    });
    list.style.display=values.length?'block':'none';
}
document.addEventListener('click',event=>{if(!event.target.closest('.form-group'))document.querySelectorAll('.dropdown-list').forEach(el=>el.style.display='none');});

function detectScript(value) { return {bn:/[\u0980-\u09FF]/.test(value),en:/[A-Za-z]/.test(value)}; }
function matchesLanguage(value, selected) {
    const script=detectScript(value);
    return selected==='Bengali' ? script.bn&&!script.en : script.en&&!script.bn;
}
function checkWordCount(field) {
    const words=field.value.trim().split(/\s+/).filter(Boolean);
    $('wordCountDisplay').textContent=words.length;
    return words.length;
}
function validateLanguage() {
    const selected=languageField.value;
    if(!selected) { message(text('chooseLanguage'),'error'); languageField.focus(); return false; }
    const title=$('bookTitle').value.trim(), author=$('authorName').value.trim(), description=$('descriptionField').value.trim();
    if(!matchesLanguage(title,selected)||!matchesLanguage(author,selected)||(description&&!matchesLanguage(description,selected))) {
        message(text('mismatch'),'error'); return false;
    }
    if(checkWordCount($('descriptionField'))>150) { message(text('wordLimit'),'error'); return false; }
    $('CategoryValue').value=$('categorySearch').value.trim();
    $('PublisherValue').value=$('publisherSearch').value.trim();
    if(!$('CategoryValue').value||!$('PublisherValue').value) { message(text('invalidFields'),'error'); return false; }
    return true;
}

function switchMode(mode, button) {
    currentMode=mode; selectedBook=null; clearMessage();
    $('BookId').value='';
    document.querySelectorAll('.mode-btn[data-mode]').forEach(el=>el.classList.toggle('active',el===button));
    document.querySelectorAll('.details-field').forEach(el=>el.classList.toggle('hidden',mode!=='add'));
    $('bookIdGroup').classList.add('hidden');
    $('submitBtn').classList.toggle('hidden',mode==='delete'||mode==='edit');
    $('management-panel').hidden=mode==='add';
    if(mode!=='add') {
        $('booksList').innerHTML='<div class="empty-state">'+text('loading')+'</div>';
        if(emailField.value.trim()) loadBooks(); else $('booksList').innerHTML='<div class="empty-state">'+text('enterEmail')+'</div>';
    }
    applyLanguage();
}
function rowValue(book, keys) {
    const obj={}; Object.keys(book||{}).forEach(key=>obj[key.toLowerCase().replace(/[^a-z0-9]/g,'')]=book[key]);
    for(const key of keys){const value=obj[key.toLowerCase().replace(/[^a-z0-9]/g,'')];if(value!==undefined&&value!==null)return value;}
    return '';
}
async function requestJson(url, options) {
    const response=await fetch(url,options||{});
    const raw=await response.text(); let data;
    try { data=JSON.parse(raw); } catch (_) { throw new Error('Apps Script endpoint returned an invalid response.'); }
    if(!response.ok||data.ok===false||data.success===false) throw new Error(data.message||'Request failed.');
    return data;
}
async function fetchSellerName(email) {
    if(!email||!emailField.checkValidity()) return;
    try {
        const data=await requestJson(scriptURL+'?action=getSellerName&email='+encodeURIComponent(email));
        if(data.name) $('SellerName').value=data.name;
        if(currentMode!=='add') loadBooks();
    } catch(error) { console.warn('Seller lookup:',error); }
}
async function loadBooks() {
    const email=emailField.value.trim();
    if(!email||!emailField.checkValidity()){message(text('invalidEmail'),'error');return;}
    $('booksList').innerHTML='<div class="empty-state">'+text('loading')+'</div>';
    try {
        const data=await requestJson(scriptURL+'?action=listBooks&email='+encodeURIComponent(email));
        renderBooks(data.books||data.items||data.data||[]);
    } catch(error) { $('booksList').innerHTML='<div class="empty-state">'+text('fetchError')+'</div>'; }
}
function renderBooks(books) {
    const list=$('booksList'); list.replaceChildren();
    if(!Array.isArray(books)||!books.length){list.innerHTML='<div class="empty-state">'+text('empty')+'</div>';return;}
    books.forEach(book=>{
        const id=rowValue(book,['BookId','ID','id']);
        const row=document.createElement('div'); row.className='book-row';
        const detail=document.createElement('div');
        const title=document.createElement('div'); title.className='book-row-title'; title.textContent=rowValue(book,['Book Title','Title'])||id||'Book';
        const meta=document.createElement('div'); meta.className='book-row-meta'; meta.textContent=[rowValue(book,['Author']),id].filter(Boolean).join(' · ');
        detail.append(title,meta); row.appendChild(detail);
        const actions=document.createElement('div'); actions.className='book-actions';
        if(currentMode==='edit') {
            const edit=document.createElement('button'); edit.type='button'; edit.className='book-action'; edit.title=text('editAction'); edit.innerHTML='<i class="fa-solid fa-pencil"></i>'; edit.addEventListener('click',()=>editBook(book)); actions.appendChild(edit);
        } else {
            const del=document.createElement('button'); del.type='button'; del.className='book-action delete'; del.title=text('deleteAction'); del.innerHTML='<i class="fa-solid fa-trash"></i>'; del.addEventListener('click',()=>deleteBook(id)); actions.appendChild(del);
        }
        row.appendChild(actions); list.appendChild(row);
    });
}
function editBook(book) {
    selectedBook=book; currentMode='edit';
    document.querySelectorAll('.details-field').forEach(el=>el.classList.remove('hidden'));
    $('bookIdGroup').classList.remove('hidden'); $('submitBtn').classList.remove('hidden');
    $('BookId').value=rowValue(book,['BookId','ID','id']);
    languageField.value=rowValue(book,['Language'])||'English'; handleLanguageChange();
    $('categorySearch').value=rowValue(book,['Category','Genre']); $('CategoryValue').value=$('categorySearch').value;
    $('publisherSearch').value=rowValue(book,['Publishers','Publisher']); $('PublisherValue').value=$('publisherSearch').value;
    form.elements.namedItem('Book Title').value=rowValue(book,['Book Title','Title']);
    form.elements.namedItem('Author').value=rowValue(book,['Author']); form.elements.namedItem('ISBN').value=rowValue(book,['ISBN']);
    form.elements.namedItem('New Price').value=rowValue(book,['New Price','Price']); form.elements.namedItem('Old Price').value=rowValue(book,['Old Price','Original Price']);
    form.elements.namedItem('Condition').value=rowValue(book,['Condition'])||'New'; form.elements.namedItem('Status').value=rowValue(book,['Status'])||'New Arrival';
    $('imageUrl').value=rowValue(book,['Image','Image URL']); form.elements.namedItem('Description').value=rowValue(book,['Description']);
    checkWordCount($('descriptionField')); applyLanguage(); $('submitBtn').innerHTML='<i class="fa-solid fa-floppy-disk"></i> '+text('updateBook');
    $('bookFields').scrollIntoView({behavior:'smooth',block:'start'});
}
async function deleteBook(id) {
    if(!id||!confirm(text('deleteConfirm'))) return;
    try {
        const result=await requestJson(scriptURL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'delete',BookId:id,EmailAddress:emailField.value.trim()})});
        message(result.message||text('deleted'),'success'); loadBooks();
    } catch(error) { message(error.message,'error'); }
}
function handleFormSubmit(event) {
    event.preventDefault();
    if(!emailField.value.trim()||!emailField.checkValidity()){message(text('invalidEmail'),'error');emailField.focus();return;}
    if(!$('bookTitle').value.trim()||!$('authorName').value.trim()){message(text('invalidFields'),'error');return;}
    if(!validateLanguage()) return;
    const fields=Object.fromEntries(new FormData(form).entries());
    fields.action=currentMode==='edit'?'update':'add'; fields.EmailAddress=emailField.value.trim(); fields.SellerName=$('SellerName').value; fields.ImageFileData=uploadedImageData;
    fields['Email Address']=fields.EmailAddress;
    fields['Seller name']=fields.SellerName;
    requestJson(scriptURL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(fields)})
        .then(result=>{
            message(result.message||(currentMode==='edit'?text('updated'):text('added')),'success');
            if(currentMode==='edit') {
                selectedBook=null;
                document.querySelectorAll('.details-field').forEach(el=>el.classList.add('hidden'));
                $('bookIdGroup').classList.add('hidden'); $('submitBtn').classList.add('hidden'); clearBookFields(); loadBooks();
            } else clearBookFields();
        })
        .catch(error=>message(error.message,'error'));
}
function clearBookFields() {
    $('BookId').value='';
    ['Category','Publishers','Book Title','Author','ISBN','New Price','Old Price','Image','Description'].forEach(name=>{const input=form.elements.namedItem(name);if(input)input.value='';});
    languageField.value=''; $('categorySearch').value=''; $('publisherSearch').value=''; $('wordCountDisplay').textContent='0'; clearUploadedImage(); applyLanguage();
}
function clearUploadedImage() { uploadedImageData=''; $('imageFile').value=''; $('imagePreview').classList.remove('visible'); $('previewImage').removeAttribute('src'); $('previewName').textContent=''; }
function chooseImage(file) {
    if(!file) return;
    if(file.size>5*1024*1024){message(text('imageError'),'error');$('imageFile').value='';return;}
    const reader=new FileReader(); reader.onload=()=>{uploadedImageData=String(reader.result);$('previewImage').src=uploadedImageData;$('previewName').textContent=file.name;$('imagePreview').classList.add('visible');}; reader.readAsDataURL(file);
}
async function openProfile() {
    const email=emailField.value.trim(); if(!email||!emailField.checkValidity()){message(text('invalidEmail'),'error');emailField.focus();return;}
    $('profile-panel').hidden=false; $('profileName').value=$('SellerName').value;
    try {
        const result=await requestJson(scriptURL+'?action=getProfile&email='+encodeURIComponent(email)); const profile=result.profile||result;
        $('profileName').value=profile.SellerName||profile.name||$('SellerName').value;
        $('profilePhone').value=profile.Phone||profile.phone||''; $('profileBusiness').value=profile.BusinessName||profile.businessName||''; $('profileAddress').value=profile.Address||profile.address||'';
    } catch (_) { message(text('profileError'),'info'); }
}
async function saveProfile() {
    const data={action:'updateProfile',EmailAddress:emailField.value.trim(),SellerName:$('profileName').value.trim(),Phone:$('profilePhone').value.trim(),BusinessName:$('profileBusiness').value.trim(),Address:$('profileAddress').value.trim()};
    try { const result=await requestJson(scriptURL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(data)}); $('SellerName').value=data.SellerName; message(result.message||text('profileSaved'),'success'); $('profile-panel').hidden=true; }
    catch(error) { message(error.message,'error'); }
}
function checkWordCountFromInput() {
    const count=$('descriptionField').value.trim().split(/\s+/).filter(Boolean).length;
    $('wordCountDisplay').textContent=count;
}

$('EmailAddress').addEventListener('blur',()=>fetchSellerName(emailField.value.trim()));
$('reloadBooks').addEventListener('click',loadBooks);
$('editProfileBtn').addEventListener('click',openProfile);
$('saveProfile').addEventListener('click',saveProfile);
$('imageFile').addEventListener('change',event=>chooseImage(event.target.files[0]));
$('clearImage').addEventListener('click',clearUploadedImage);
$('descriptionField').addEventListener('input',checkWordCountFromInput);
applyLanguage();
switchMode('add',document.querySelector('[data-mode="add"]'));

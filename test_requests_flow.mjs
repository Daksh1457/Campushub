/**
 * End-to-end test for CampusHub Requests + Chat flow
 */

import { readFileSync } from 'fs';

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.log(`  ❌ FAIL: ${label}`);
    failed++;
  }
}

const storeSrc = readFileSync('js/store.js', 'utf8');
const appSrc = readFileSync('js/app.js', 'utf8');

// Helper: find method definition (e.g. "renderFoo() {" or "async handleBar(") and extract body
function getMethodBody(src, defPattern) {
  const start = src.indexOf(defPattern);
  if (start === -1) return '';
  const braceStart = src.indexOf('{', start);
  if (braceStart === -1) return '';
  let depth = 0;
  for (let i = braceStart; i < src.length; i++) {
    if (src[i] === '{') depth++;
    if (src[i] === '}') depth--;
    if (depth === 0) return src.substring(start, i + 1);
  }
  return '';
}

// ========================================
// 1. Store methods — all render-called methods must be sync
// ========================================
console.log('\n📋 Test 1: Store methods — sync/async correctness');
const mustBeSync = [
  'getSentRequests', 'getAcceptedConnections', 'getChat',
  'getReceivedRequests', 'getProjects', 'getResources',
  'getCollabPosts', 'getUpdates', 'getUnreadUpdatesCount',
  'getCurrentUser', 'getRegisteredUsers', 'getStudentAccountsCount',
  'getAdminAccountsCount', 'isAdmin', 'getState', 'deleteUser',
];

for (const fn of mustBeSync) {
  const regex = new RegExp(`(?:async\\s+)?${fn}\\s*\\(`);
  const match = storeSrc.match(regex);
  if (match) {
    assert(!match[0].startsWith('async'), `${fn}() is synchronous`);
  }
}

// ========================================
// 2. Async handlers properly await store calls
// ========================================
console.log('\n📋 Test 2: Async handlers use await on store calls');
const asyncHandlers = {
  'handleUploadResourceSubmit': 'addResource',
  'handleDeleteResource': 'deleteResource',
  'handleUploadProjectSubmit': 'addProject',
  'handleAddCollabPostSubmit': 'addCollabPost',
  'handleSendRequestSubmit': 'sendCollabRequest',
  'handleAcceptRequest': 'acceptRequest',
  'handleDeclineRequest': 'declineRequest',
  'handlePostUpdateSubmit': 'addUpdate',
  'handleEditProfileSubmit': 'updateProfile',
  'handleAddSkill': 'addSkill',
  'handleRemoveSkill': 'removeSkill',
  'handleLogout': 'logout',
  'handleSignUp': 'registerUser',
  'handleLogin': 'login',
  'handleForgotReset': 'resetPassword',
  'handleSendMessage': 'sendMessage',
  'toggleUserRole': 'switchUser',
};

for (const [handler, method] of Object.entries(asyncHandlers)) {
  const body = getMethodBody(appSrc, `async ${handler}(`);
  assert(body.length > 0, `${handler} is async`);
  if (body) {
    assert(body.includes(`await this.store.${method}(`), `${handler} awaits store.${method}()`);
  }
}

// ========================================
// 3. renderPdfViewerModal — multi-file type support
// ========================================
console.log('\n📋 Test 3: renderPdfViewerModal — multi-file type viewer');
const viewerBody = getMethodBody(appSrc, 'renderPdfViewerModal() {');
assert(viewerBody.length > 500, 'renderPdfViewerModal exists');
if (viewerBody) {
  assert(viewerBody.includes('fileType'), 'Uses fileType variable');
  assert(viewerBody.includes('isPdf'), 'Has isPdf check for PDF vs other types');
  assert(viewerBody.includes('getFileTypeIcon'), 'Uses getFileTypeIcon');
  assert(!viewerBody.includes('await this.store.'), 'No async store calls');
}

// ========================================
// 4. renderRequests — data structure
// ========================================
console.log('\n📋 Test 4: renderRequests — data structure');
const reqBody = getMethodBody(appSrc, 'renderRequests() {');
assert(reqBody.length > 500, 'renderRequests exists');
if (reqBody) {
  assert(reqBody.includes('req.fromUser'), 'Accesses req.fromUser');
  assert(reqBody.includes('req.title'), 'Accesses req.title');
  assert(reqBody.includes('req.note'), 'Accesses req.note');
  assert(reqBody.includes('req.id'), 'Accesses req.id');
  assert(reqBody.includes('handleAcceptRequest'), 'Has Accept button');
  assert(reqBody.includes('handleDeclineRequest'), 'Has Decline button');
  assert(reqBody.includes('conn.title'), 'Accepted connections show title');
  assert(reqBody.includes('peer.name'), 'Active chats show peer name');
  assert(reqBody.includes('chat_modal'), 'Chat button opens chat modal');
}

// ========================================
// 5. renderChatModal — message rendering
// ========================================
console.log('\n📋 Test 5: renderChatModal — message rendering');
const chatBody = getMethodBody(appSrc, 'renderChatModal() {');
assert(chatBody.length > 200, 'renderChatModal exists');
if (chatBody) {
  assert(chatBody.includes('getChat'), 'Calls getChat');
  assert(chatBody.includes('messages.map'), 'Maps messages array');
  assert(chatBody.includes('msg.text'), 'Displays message text');
  assert(chatBody.includes('msg.timestamp'), 'Displays timestamp');
  assert(chatBody.includes('chat-input-text'), 'Has input field');
  assert(chatBody.includes('handleSendMessage'), 'Send triggers handleSendMessage');
}

// ========================================
// 6. _mapRequestFromDB — field mapping
// ========================================
console.log('\n📋 Test 6: _mapRequestFromDB — field mapping');
const mapBody = getMethodBody(storeSrc, '_mapRequestFromDB(row) {');
assert(mapBody.includes('fromUser'), 'Maps fromUser');
assert(mapBody.includes('toUser'), 'Maps toUser');
assert(mapBody.includes('status'), 'Maps status');
assert(mapBody.includes('note'), 'Maps note');
assert(mapBody.includes('title'), 'Maps title');

// ========================================
// 7. sendCollabRequest — creates proper request
// ========================================
console.log('\n📋 Test 7: sendCollabRequest — data creation');
const sendBody = getMethodBody(storeSrc, 'async sendCollabRequest(');
assert(sendBody.includes("'pending'"), 'Defaults to pending');
assert(sendBody.includes('from_user_id'), 'Sets from_user_id');
assert(sendBody.includes('to_user_id'), 'Sets to_user_id');

// ========================================
// 8. acceptRequest — chat unlock
// ========================================
console.log('\n📋 Test 8: acceptRequest — chat unlock');
const acceptBody = getMethodBody(storeSrc, 'async acceptRequest(');
assert(acceptBody.includes("'accepted'"), 'Sets status accepted');
assert(acceptBody.includes('this.state.chats'), 'Initializes chat');

// ========================================
// 9. Upload buttons admin-only
// ========================================
console.log('\n📋 Test 9: Upload buttons — admin-only');
const uploadRe = /openModal\('upload_resource'\)/g;
let m, total = 0, guarded = 0;
while ((m = uploadRe.exec(appSrc)) !== null) {
  total++;
  const before = appSrc.substring(Math.max(0, m.index - 200), m.index);
  if (before.includes('isAdmin')) guarded++;
}
assert(total >= 2 && guarded === total, `All ${total} upload buttons guarded (${guarded})`);

// ========================================
// 10. Resource upload — multi-file types
// ========================================
console.log('\n📋 Test 10: Resource upload — multi-file type support');
assert(appSrc.includes('.doc,.docx'), 'Accepts Word');
assert(appSrc.includes('.ppt,.pptx'), 'Accepts PPT');
assert(appSrc.includes('.xls,.xlsx'), 'Accepts Excel');
assert(appSrc.includes('isAcceptedFileType'), 'File type validation');
assert(appSrc.includes('getFileTypeLabel'), 'File type label');
assert(appSrc.includes('getFileTypeIcon'), 'File type icon');

// ========================================
// 11. quickSwitchUser wrapper
// ========================================
console.log('\n📋 Test 11: quickSwitchUser — async wrapper');
const qsBody = getMethodBody(appSrc, 'async quickSwitchUser(');
assert(qsBody.includes('await this.store.switchUser'), 'Awaits switchUser');
assert(qsBody.includes('this.closeModal'), 'Closes modal');

// ========================================
// SUMMARY
// ========================================
console.log(`\n${'='.repeat(50)}`);
console.log(`📊 Results: ${passed} passed, ${failed} failed out of ${passed + failed} total`);
console.log(`${'='.repeat(50)}\n`);

process.exit(failed > 0 ? 1 : 0);


function showBadge(text, color) {
  chrome.action.setBadgeBackgroundColor({ color: color });
  chrome.action.setBadgeText({ text: text });
  setTimeout(() => {
    chrome.action.setBadgeText({ text: '' });
  }, 3000);
}

chrome.action.onClicked.addListener((tab) => {
  chrome.scripting.executeScript(
    {
      target: { tabId: tab.id },
      files: ['turndown.umd.js'],
    },
    () => {

      chrome.scripting.executeScript(
        {
          target: { tabId: tab.id },
          function: () => {
            const title = document.querySelector('title').textContent;
            const titleMarkdown = (title) ? '# '+title+'\n\n' : '';

            // class : items-start
            const items = document.querySelectorAll('.items-start');
            const turndownService = new TurndownService({
              codeBlockStyle: 'fenced',
              headingStyle: 'atx',
              bulletListMarker: '-'
            });
            turndownService.addRule('codeBlock', {
              filter: 'pre',
              replacement: function (content, node) {
                const lang = node.querySelector('.rounded-md div span').innerText ?? '';
                const code = node.querySelector('code').innerText;
                return '```' + lang + '\n' + code + '```\n';
              }
            });
            var mds = [];
            items.forEach((item) => {
              const editButtons = item.parentNode?.parentNode?.querySelectorAll('.self-end button');
              if (editButtons.length == 1) {
                const text = item.innerText;
                mds.push('## 🤔 User\n' + (text.length > 0 && text[0] == '\n' ? '' : '\n') + text);
              } else {
                const html = item.outerHTML;
                const markdown = turndownService.turndown(html);
                mds.push('## 🤖 Assistant\n\n' + markdown);
              }
            });
            mds.pop(); // 最後の1つはリストなので不要
            const markdown = titleMarkdown + mds.join('\n\n---\n');
            navigator.clipboard.writeText(markdown);
          },
        },
        () => {
          if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError);
            showBadge('Error','#800000');
          } else {
            showBadge('Copied','#008000');
          }
        }
      );
    }
  );
});

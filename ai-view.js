import * as markdown from './vendor/streaming-markdown.js'

export function safeAIUrl(value, image = false) {
    try {
        const url = new URL(value)
        return (['https:', 'http:'].includes(url.protocol) || (!image && url.protocol === 'mailto:')) ? url.href : ''
    } catch { return '' }
}

async function copyText(text, root) {
    try { await navigator.clipboard.writeText(text) }
    catch {
        // Clipboard API is unavailable on ordinary HTTP pages.
        const input = document.createElement('textarea')
        input.value = text
        input.style.cssText = 'position:fixed;opacity:0;pointer-events:none'
        root.append(input)
        const active = root.activeElement
        input.select()
        const copied = document.execCommand('copy')
        input.remove()
        active?.focus({ preventScroll: true })
        if (!copied) throw new Error('复制失败，请选中文字手动复制。')
    }
}

export function createAnswerView(root, { provider, question, images = [], history = [], onFinish }) {
    const panel = document.createElement('section')
    panel.className = 'j-ai-answer j-ai-answer-pending'
    panel.setAttribute('aria-label', 'AI 回答')
    panel.hidden = true
    panel.innerHTML = `
        <header class="j-ai-header"><span class="j-ai-model"></span></header>
        <div class="j-ai-scroll" tabindex="0" aria-label="回答内容">
            <div class="j-ai-question"></div><div class="j-ai-question-images" hidden></div>
            <article class="j-ai-markdown"><span class="j-ai-end-state" role="status"><span class="j-ai-loading" aria-label="正在生成"><i></i><i></i><i></i></span><span class="j-ai-message"></span></span></article>
            <details class="j-ai-sources" hidden>
                <summary></summary>
                <div class="j-ai-keywords" hidden><div class="j-ai-source-label">搜索关键词</div><ul></ul></div>
                <div class="j-ai-source-pages" hidden><div class="j-ai-source-label">参考网页</div><div class="j-ai-source-links"></div></div>
            </details>
        </div>`
    root.getElementById('j-ai-answer-stage').append(panel)
    const get = selector => panel.querySelector(selector)
    const scroller = get('.j-ai-scroll')
    const article = get('article')
    const sources = get('.j-ai-sources')
    const keywords = get('.j-ai-keywords')
    const keywordList = keywords.querySelector('ul')
    const sourcePages = get('.j-ai-source-pages')
    const sourceLinks = get('.j-ai-source-links')
    const endState = get('.j-ai-end-state')
    const loading = get('.j-ai-loading')
    const messageNode = get('.j-ai-message')
    get('.j-ai-model').textContent = `${provider.name} · ${provider.model}`
    get('.j-ai-question').textContent = question
    if (images.length) {
        const imageStrip = get('.j-ai-question-images')
        imageStrip.hidden = false
        for (const src of images) {
            const image = document.createElement('img')
            image.src = src
            image.alt = '本轮提问的图片'
            imageStrip.append(image)
        }
    }
    let pending = ''
    let timer
    let finished = false
    let following = true
    let highlighter
    const highlightLanguages = new Set(['asm', 'bash', 'c', 'css', 'diff', 'docker', 'git', 'go', 'html', 'http', 'ini', 'java', 'js', 'json', 'lua', 'make', 'md', 'plain', 'py', 'rs', 'sql', 'toml', 'ts', 'xml', 'yaml'])
    const highlightAliases = {
        javascript: 'js', jsx: 'js', typescript: 'ts', tsx: 'ts', python: 'py',
        shell: 'bash', sh: 'bash', zsh: 'bash', markup: 'html', markdown: 'md',
        rust: 'rs', makefile: 'make', dockerfile: 'docker', yml: 'yaml',
        text: 'plain', plaintext: 'plain', txt: 'plain', jsonc: 'json'
    }
    const hasSelection = () => {
        const selection = root.getSelection?.() || window.getSelection()
        return selection && !selection.isCollapsed && (article.contains(selection.anchorNode) || article.contains(selection.focusNode))
    }
    const atBottom = () => scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 36
    const follow = () => {
        if (following && !hasSelection()) scroller.scrollTop = scroller.scrollHeight
    }
    const placeLoadingAtTextEnd = () => {
        if (finished) return
        const currentNode = renderer.data.nodes[renderer.data.index]
        const currentElement = currentNode?.nodeType === Node.ELEMENT_NODE ? currentNode : currentNode?.parentElement
        const textBlock = currentElement?.closest?.('p,li,td,th,h1,h2,h3,h4,h5,h6,blockquote')
        const lastBlock = article.lastElementChild?.matches?.('p,li,h1,h2,h3,h4,h5,h6,blockquote') ? article.lastElementChild : null
        ;(textBlock || lastBlock || article).append(endState)
    }
    scroller.addEventListener('wheel', event => { if (event.deltaY < 0) following = false }, { passive: true })
    scroller.addEventListener('pointerdown', () => { following = false })
    scroller.addEventListener('scroll', () => {
        following = atBottom() && !hasSelection()
    })
    const observer = new ResizeObserver(follow)
    observer.observe(article)
    observer.observe(sources)

    function highlightCode(node) {
        if (node.dataset.jHighlight !== undefined) return
        node.dataset.jHighlight = ''
        const raw = node.className.trim().split(/\s+/)[0].toLowerCase().replace(/^language-/, '')
        const language = highlightAliases[raw] || raw || 'plain'
        const supported = highlightLanguages.has(language) ? language : 'plain'
        node.classList.add(`shj-lang-${supported}`)
        if (!root.querySelector('[data-speed-highlight]')) {
            const css = document.createElement('link')
            css.rel = 'stylesheet'
            css.href = chrome.runtime.getURL('vendor/speed-highlight/github-dark.css')
            css.dataset.speedHighlight = ''
            root.append(css)
        }
        highlighter ||= import('./vendor/speed-highlight/index.js')
        highlighter.then(({ highlightElement }) => {
            if (node.isConnected) return highlightElement(node, supported, { block: false })
        }).catch(() => {})
    }

    const renderer = markdown.default_renderer(article)
    const setAttribute = renderer.set_attr
    const endToken = renderer.end_token
    renderer.set_attr = (data, type, value) => {
        const node = data.nodes[data.index]
        if (type === markdown.HREF || type === markdown.SRC) {
            const url = safeAIUrl(value, type === markdown.SRC)
            if (!url) return
            value = url
            if (type === markdown.HREF) { node.target = '_blank'; node.rel = 'noopener noreferrer' }
            else { node.loading = 'lazy'; node.referrerPolicy = 'no-referrer' }
        }
        setAttribute(data, type, value)
    }
    renderer.end_token = data => {
        const node = data.nodes[data.index]
        endToken(data)
        if (node.tagName === 'CODE' && node.parentElement?.tagName === 'PRE') {
            const button = document.createElement('button')
            button.type = 'button'
            button.className = 'j-ai-copy-code'
            button.textContent = '复制'
            button.addEventListener('click', () => copyText(node.textContent, root).then(() => { button.textContent = '已复制' }).catch(() => { button.textContent = '复制失败' }))
            node.parentElement.append(button)
            highlightCode(node)
        }
        if (node.tagName === 'EQUATION-BLOCK' || node.tagName === 'EQUATION-INLINE') {
            renderMath(node)
        }
    }
    const parser = markdown.parser(renderer)
    function flush() {
        clearTimeout(timer)
        timer = null
        if (pending) {
            endState.remove()
            markdown.parser_write(parser, pending)
            pending = ''
            placeLoadingAtTextEnd()
        }
        follow()
    }
    async function renderMath(node) {
        const tex = node.textContent
        try {
            const { default: temml } = await import('./vendor/temml.js')
            if (!panel.isConnected || hasSelection()) return
            if (!root.querySelector('[data-temml]')) {
                const css = document.createElement('link')
                css.rel = 'stylesheet'
                css.href = chrome.runtime.getURL('vendor/temml.css')
                css.dataset.temml = ''
                root.append(css)
            }
            temml.render(tex, node, { displayMode: node.tagName === 'EQUATION-BLOCK', throwOnError: false, trust: false })
        } catch { node.textContent = tex }
    }
    const port = chrome.runtime.connect({ name: 'jstart:ai' })
    let context
    function finish(statusMessage, error = false) {
        if (finished) return
        flush()
        finished = true
        markdown.parser_end(parser)
        article.querySelectorAll('pre code').forEach(highlightCode)
        loading.hidden = true
        if (error) {
            endState.classList.add('j-ai-error')
            messageNode.textContent = statusMessage
        } else {
            endState.hidden = true
        }
        const keywordCount = keywordList.children.length
        const sourceCount = sourceLinks.children.length
        keywords.hidden = !keywordCount
        sourcePages.hidden = !sourceCount
        if (keywordCount || sourceCount) {
            sources.querySelector('summary').textContent = [
                keywordCount ? `搜索 ${keywordCount} 个关键词` : '',
                sourceCount ? `参考 ${sourceCount} 篇资料` : ''
            ].filter(Boolean).join('，')
            sources.hidden = false
        }
        port.disconnect()
        follow()
        onFinish?.(error ? null : context)
    }
    port.onMessage.addListener(event => {
        if (finished) return
        if (event.type === 'start') {
            get('.j-ai-model').textContent = `${event.name} · ${event.model}`
        }
        if (event.type === 'text') {
            pending += event.text
            if (!timer) timer = setTimeout(flush, 32)
        }
        if (event.type === 'source') {
            const url = safeAIUrl(event.url)
            if (url && !Array.from(sourceLinks.children).some(node => node.href === url)) {
                const link = document.createElement('a')
                link.href = url
                link.target = '_blank'
                link.rel = 'noopener noreferrer'
                link.textContent = `${sourceLinks.children.length + 1}. ${event.title}`
                sourceLinks.append(link)
            }
        }
        if (event.type === 'searchSummary') {
            keywordList.replaceChildren(...event.keywords.map(keyword => {
                const item = document.createElement('li')
                item.textContent = keyword
                return item
            }))
        }
        if (event.type === 'context') context = event.context
        if (event.type === 'done') finish('回答完成')
        if (event.type === 'stopped') finish('已停止')
        if (event.type === 'error') finish(event.message, true)
    })
    port.onDisconnect.addListener(() => {
        const error = chrome.runtime.lastError
        if (!finished) finish(error?.message || '连接中断，可以重试。', true)
    })
    port.postMessage({ type: 'ask', provider: provider.id, prompt: provider.prompt, question, images, history })
    return {
        show() {
            panel.hidden = false
            panel.classList.remove('j-ai-answer-pending')
        },
        hide() { panel.hidden = true },
        get panel() { return panel },
        destroy() {
            finished = true
            clearTimeout(timer)
            observer.disconnect()
            port.disconnect()
            panel.remove()
        }
    }
}

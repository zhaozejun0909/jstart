# AI 快速问答

刷新扩展后，在选项页的「AI 快速问答」选择问答平台并填写该平台的 API Key。平台选择和 API Key 自动保存；系统提示词需单独点击「保存提示词」。已打开的普通网页需要刷新一次，才能加载新的输入框代码。

| 平台 | 接口 | 模型配置 |
| --- | --- | --- |
| 豆包 / 火山方舟 | Responses | 固定使用 `doubao-seed-2-1-pro-260915` |
| DeepSeek | Chat Completions | 固定使用 `deepseek-flash` |
| 小米 MiMo | Chat Completions | 固定使用 `mimo-v2.6-flash` |

API Key 仅保存到扩展的本机存储；请求由扩展后台直接发送给对应平台。语义识别固定使用 DeepSeek Flash，与 DeepSeek 问答复用同一 API Key，开关自动保存。关闭时仍可手动切换到 AI 入口。原有 MiMo 语义识别 Key 会用于新增的 MiMo 问答模型。

MiMo 的 `sk-` Key 使用按量接口，`tp-` / `ttp-` Key 使用中国区 Token Plan 接口。

问答使用各模型默认思考模式；语义识别关闭 DeepSeek 思考模式。豆包可自行判断是否联网搜索，DeepSeek 和 MiMo 暂不接联网工具。各平台的系统提示词可编辑；已保存的内容保持不变，需要使用新版内置提示词时点击「恢复默认提示词」再点击「保存提示词」。

每次提问由后台读取最新保存的系统提示词；在对话期间修改并保存提示词后，下一问立即使用新版本。提示词不再发送到前台，也不由前台随问题传回后台。

## 使用

- 点击输入框右侧图标，或按 `Tab`，在搜索和 AI 两种模式间切换；`Shift + Tab` 在当前模式下切换搜索引擎（Google、百度、必应）或大模型，未配置 Key 的模型会被跳过。鼠标在图标上悬停半秒，会在图标旁弹出一圈二级选项，点击即可切换；未配置的模型显示为灰色，点击会打开选项页。图标始终显示当前选中的搜索引擎或大模型。联想结果可用上下方向键或鼠标选择。
- 选项页里的平台下拉框只用于选择要配置哪个平台，不改变正在使用的模型。
- 在 AI 入口输入问题后按 `Enter` 发送，`Shift + Enter` 换行。本地结果和网址仍优先，斜杠命令、`file://` 与 P 参数模式保持原有操作。
- 开启语义识别并配置 DeepSeek Key 后，普通搜索输入若更适合 AI 回答，搜索建议会显示“问问 AI 吧”；本地结果仍排在前面。选中后按 `Enter` 或直接点击会切换并记住 AI 模式，再发送问题。末尾空格可跳过本地精确匹配。
- 在输入框粘贴图片可直接预览并删除；最多 4 张，单张不超过 5 MB，支持 PNG、JPEG、GIF 和 WebP。有图片时本次输入会直接发送给选定的 AI 平台，不显示搜索建议，也不调用语义识别。只粘贴图片时按 `Enter` 也能提问。
- 回答支持 Markdown、表格、代码块高亮、链接和图片链接。公式保留为原始文本，不做数学排版。代码块可单独复制；不接图片/音视频生成。
- 输出自动跟随底部；向上滚动或选择文字后暂停跟随，滚动到底部后恢复。
- 首次提问后输入框移到顶部，发送下一问时输入框清空。回答保持居中；第二问起，左侧按时间倒序列出本次对话的问题。列表单行省略，悬停可看完整问题；右侧只显示选中问题的答案。点击旧问题只切换显示，不改变后续提问的上下文。
- 本次对话中可以切换回搜索引擎；搜索、打开网址或书签会在新标签页进行，保留当前对话。对话中也可以切换大模型，从下一问开始使用新模型，并带上之前的问答；从豆包切走时只带文字回答，不带它的加密思考内容。每个回答上方标明是哪个模型回答的。按 `Esc` 关闭并清空整段对话；有输入内容、图片或对话时，点击空白区域不会关闭。

后续提问会携带本次对话中已完成的问答及用户主动粘贴的图片；不会读取当前页面内容或书签。同一时间只发送一轮回答，上一轮完成后才可发送下一问。关闭输入框会取消请求并清空本次对话，插件不在本地保存问答历史；下次打开一定是新对话。豆包请求使用 `store: false`；DeepSeek 和 MiMo 的 Chat Completions 请求由插件手动回传历史，不创建可继续查询的服务端会话。平台内部的缓存或日志不由插件控制。

## 实现

使用原生 `fetch` 和 SSE，不引入模型 SDK、React 或构建步骤。Markdown 渲染器约 13 KB；代码高亮按需加载，不引入公式渲染库。依赖均随扩展本地打包。模型生成的 HTML 作为文字显示；链接和图片地址只允许约定协议。

豆包接入按火山方舟文档核对：Pro 260915 支持 Responses API 与联网内容插件；思考模式仅支持开启（默认）和关闭。请求使用 `instructions`、`store: false` 和流式输出，联网时携带 `ark-beta-web-search: true`；提供搜索工具后由默认的 `tool_choice: auto` 决定是否调用。多轮由扩展手动回传用户输入、模型回答以及原样的加密思考输出，不使用服务端 `previous_response_id`。界面只展示最终回答文本，忽略思考摘要。默认提示词只描述问答目标、事实核查和展示要求，不规定内部推理步骤，也不依赖未传入的搜索结果占位符。联网引用可能附有 `cover_image`，当前只展示来源链接；图片仍取决于回答正文是否实际提供可用的 Markdown 图片链接。

MiMo 问答使用官方 Chat Completions，按 Key 前缀选择按量接口或中国区 Token Plan 接口。图片以 `image_url` 的 Base64 Data URL 传入；无工具调用，多轮只回传用户消息和最终回答。语义识别使用 DeepSeek Flash 的 Chat Completions，显式设置 `thinking: disabled`、不提供联网工具，返回 0–100 的 AI 适合度；达到 50 时显示 AI 联想项。

API 协议参考：[火山方舟创建 Response](https://docs.volcengine.com/docs/ark/create-model-responses-api?lang=zh)、[火山方舟 Agent 多轮调用](https://docs.volcengine.com/docs/ark/agent-model-invocation-practice?lang=zh)、[火山方舟联网搜索工具](https://docs.volcengine.com/docs/ark/web-search?lang=zh)、[DeepSeek Chat Completions](https://api-docs.deepseek.com/api/create-chat-completion/)、[DeepSeek 多轮对话](https://api-docs.deepseek.com/guides/multi_round_chat/)、[MiMo Chat Completions](https://mimo.mi.com/docs/zh-CN/api/chat/openai-api)、[MiMo 图片理解](https://mimo.mi.com/docs/zh-CN/quick-start/usage-guide/multimodal-understanding/image-understanding)、[MiMo 深度思考与多轮](https://mimo.mi.com/docs/zh-CN/quick-start/usage-guide/text-generation/deep-thinking)、[MiMo Token Plan](https://mimo.mi.com/docs/zh-CN/tokenplan/Token%20Plan/quick-access)。

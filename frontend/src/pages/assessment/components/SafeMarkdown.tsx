import * as React from "react"

interface SafeMarkdownProps {
  text: string
}

type ListBlock = {
  type: "ul" | "ol"
  items: string[]
}

type Block =
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "paragraph"; lines: string[] }
  | { type: "quote"; lines: string[] }
  | ListBlock

function isSafeHref(rawHref: string): boolean {
  const href = rawHref.trim()
  if (!href) return false
  if (href.startsWith("#") || href.startsWith("/")) return true
  try {
    const parsed = new URL(href)
    return ["http:", "https:", "mailto:", "tel:"].includes(parsed.protocol)
  } catch {
    return false
  }
}

function parseInline(text: string): React.ReactNode[] {
  const pattern = /(\[([^\]]+)\]\(([^)\s]+)\)|`([^`]+)`|\*\*([^*]+)\*\*|\*([^*]+)\*)/g
  const nodes: React.ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index))
    }

    const [token, , linkLabel, linkHref, codeText, boldText, italicText] = match
    const key = `${match.index}-${token}`

    if (linkLabel && linkHref) {
      const href = linkHref.trim()
      if (isSafeHref(href)) {
        nodes.push(
          <a
            key={key}
            href={href}
            target={href.startsWith("http") ? "_blank" : undefined}
            rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
            className="font-medium text-[#175e63] underline underline-offset-2 hover:text-[#124b4f]"
          >
            {linkLabel}
          </a>
        )
      } else {
        nodes.push(`${linkLabel} (${href})`)
      }
    } else if (codeText) {
      nodes.push(
        <code key={key} className="rounded bg-[#eef2f1] px-1 py-0.5 font-mono text-[0.92em] text-[#263331]">
          {codeText}
        </code>
      )
    } else if (boldText) {
      nodes.push(<strong key={key} className="font-semibold text-[#263331]">{boldText}</strong>)
    } else if (italicText) {
      nodes.push(<em key={key}>{italicText}</em>)
    } else {
      nodes.push(token)
    }

    lastIndex = pattern.lastIndex
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex))
  }
  return nodes
}

function parseBlocks(text: string): Block[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n")
  const blocks: Block[] = []
  let index = 0

  const isBlank = (line: string) => line.trim() === ""
  const isHeading = (line: string) => /^#{1,3}\s+/.test(line.trim())
  const unorderedMatch = (line: string) => line.match(/^\s*[-*]\s+(.+)$/)
  const orderedMatch = (line: string) => line.match(/^\s*\d+[.)]\s+(.+)$/)
  const quoteMatch = (line: string) => line.match(/^\s*>\s?(.*)$/)

  while (index < lines.length) {
    const line = lines[index]
    const trimmed = line.trim()

    if (isBlank(line)) {
      index += 1
      continue
    }

    const heading = trimmed.match(/^(#{1,3})\s+(.+)$/)
    if (heading) {
      blocks.push({
        type: "heading",
        level: Math.min(heading[1].length, 3) as 1 | 2 | 3,
        text: heading[2].trim(),
      })
      index += 1
      continue
    }

    const unordered = unorderedMatch(line)
    if (unordered) {
      const items: string[] = []
      while (index < lines.length) {
        const current = unorderedMatch(lines[index])
        if (!current) break
        items.push(current[1].trim())
        index += 1
      }
      blocks.push({ type: "ul", items })
      continue
    }

    const ordered = orderedMatch(line)
    if (ordered) {
      const items: string[] = []
      while (index < lines.length) {
        const current = orderedMatch(lines[index])
        if (!current) break
        items.push(current[1].trim())
        index += 1
      }
      blocks.push({ type: "ol", items })
      continue
    }

    const quote = quoteMatch(line)
    if (quote) {
      const quoteLines: string[] = []
      while (index < lines.length) {
        const current = quoteMatch(lines[index])
        if (!current) break
        quoteLines.push(current[1].trim())
        index += 1
      }
      blocks.push({ type: "quote", lines: quoteLines })
      continue
    }

    const paragraphLines: string[] = []
    while (index < lines.length) {
      const current = lines[index]
      if (
        isBlank(current)
        || isHeading(current)
        || unorderedMatch(current)
        || orderedMatch(current)
        || quoteMatch(current)
      ) {
        break
      }
      paragraphLines.push(current.trim())
      index += 1
    }
    blocks.push({ type: "paragraph", lines: paragraphLines })
  }

  return blocks
}

export function SafeMarkdown({ text }: SafeMarkdownProps) {
  const blocks = React.useMemo(() => parseBlocks(text), [text])

  if (!blocks.length) {
    return null
  }

  return (
    <div className="space-y-4 text-sm leading-7 text-[#3a4a47] [word-break:keep-all]">
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          const className =
            block.level === 1
              ? "text-lg font-bold leading-7 text-[#161d1b]"
              : block.level === 2
                ? "text-base font-semibold leading-7 text-[#161d1b]"
                : "text-sm font-semibold leading-7 text-[#263331]"
          const HeadingTag = `h${Math.min(block.level + 2, 5)}` as keyof JSX.IntrinsicElements
          return <HeadingTag key={index} className={className}>{parseInline(block.text)}</HeadingTag>
        }

        if (block.type === "ul" || block.type === "ol") {
          const ListTag = block.type
          return (
            <ListTag
              key={index}
              className={`${block.type === "ul" ? "list-disc" : "list-decimal"} space-y-1.5 pl-5 marker:text-[#175e63]`}
            >
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{parseInline(item)}</li>
              ))}
            </ListTag>
          )
        }

        if (block.type === "quote") {
          return (
            <blockquote key={index} className="border-l-4 border-[#cfe0dc] bg-[#f6f8f7] px-4 py-3 text-[#536461]">
              {block.lines.map((line, lineIndex) => (
                <React.Fragment key={lineIndex}>
                  {lineIndex > 0 && <br />}
                  {parseInline(line)}
                </React.Fragment>
              ))}
            </blockquote>
          )
        }

        if (block.type === "paragraph") {
          return (
            <p key={index}>
              {block.lines.map((line, lineIndex) => (
                <React.Fragment key={lineIndex}>
                  {lineIndex > 0 && <br />}
                  {parseInline(line)}
                </React.Fragment>
              ))}
            </p>
          )
        }

        return null
      })}
    </div>
  )
}

import { createElement, type JSX, type ReactNode } from 'react';

const FORMAT_REGEX = /\*\*(.+?)\*\*|~~(.+?)~~|__(.+?)__/g;

/**
 * Parses **bold**, ~~strikethrough~~ and __underline__ markers into React nodes.
 * Whitespace/newlines are left untouched — pair with `whitespace-pre-wrap` to render them.
 */
export function renderFormattedText(text: string): ReactNode[] {
    const parts: ReactNode[] = [];
    let lastIndex = 0;
    let key = 0;
    let match: RegExpExecArray | null;

    FORMAT_REGEX.lastIndex = 0;
    while ((match = FORMAT_REGEX.exec(text)) !== null) {
        if (match.index > lastIndex) {
            parts.push(text.slice(lastIndex, match.index));
        }
        if (match[1] !== undefined) {
            parts.push(<strong key={key++}>{match[1]}</strong>);
        } else if (match[2] !== undefined) {
            parts.push(<s key={key++}>{match[2]}</s>);
        } else if (match[3] !== undefined) {
            parts.push(<u key={key++}>{match[3]}</u>);
        }
        lastIndex = FORMAT_REGEX.lastIndex;
    }
    if (lastIndex < text.length) {
        parts.push(text.slice(lastIndex));
    }
    return parts;
}

/** Strips the ** ~~ __ markers for contexts that can't render rich text (e.g. title tooltips). */
export function stripFormatting(text: string): string {
    return text.replace(FORMAT_REGEX, (_m, bold, strike, underline) => bold ?? strike ?? underline ?? '');
}

type FormattedTextProps = {
    text: string;
    className?: string;
    as?: keyof JSX.IntrinsicElements;
};

export function FormattedText({ text, className, as = 'p' }: FormattedTextProps) {
    return createElement(
        as,
        { className: `whitespace-pre-wrap ${className ?? ''}`.trim() },
        renderFormattedText(text),
    );
}

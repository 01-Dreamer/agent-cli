import React from 'react';
import { Box, Text } from 'ink';
import stringWidth from 'string-width';

type TableBlock = {
    headers: string[];
    rows: string[][];
};

const tableSeparatorRegex = /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/;
const MIN_COLUMN_WIDTH = 4;
const MAX_COLUMN_WIDTH = 34;
const TABLE_MARGIN = 4;
const CELL_PADDING = 2;

function stripInlineMarkdown(text: string): string {
    return text
        .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/__([^_]+)__/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/_([^_]+)_/g, '$1')
        .replace(/~~([^~]+)~~/g, '$1');
}

function splitTableRow(line: string): string[] {
    return line
        .trim()
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map((cell) => stripInlineMarkdown(cell.trim()));
}

function isTableStart(lines: string[], index: number): boolean {
    return /^\s*\|.+\|\s*$/.test(lines[index] ?? '')
        && tableSeparatorRegex.test(lines[index + 1] ?? '');
}

function terminalWidth(): number {
    return Math.max(50, process.stdout.columns || 80);
}

function visualWidth(value: string): number {
    return stringWidth(value);
}

function sliceVisual(value: string, width: number): string {
    let result = '';
    let used = 0;

    for (const char of Array.from(value)) {
        const charWidth = visualWidth(char);
        if (used + charWidth > width) break;
        result += char;
        used += charWidth;
    }

    return result;
}

function padVisual(value: string, width: number): string {
    return `${value}${' '.repeat(Math.max(0, width - visualWidth(value)))}`;
}

function wrapVisual(value: string, width: number): string[] {
    if (width <= 0) return [''];
    const lines: string[] = [];
    let current = '';
    let currentWidth = 0;

    for (const char of Array.from(value)) {
        const charWidth = visualWidth(char);
        if (currentWidth + charWidth > width && current) {
            lines.push(current.trimEnd());
            current = '';
            currentWidth = 0;
        }

        if (charWidth > width) continue;
        current += char;
        currentWidth += charWidth;
    }

    lines.push(current.trimEnd());
    return lines.length > 0 ? lines : [''];
}

function normalizeTable(headers: string[], rows: string[][]): TableBlock {
    return {
        headers,
        rows: rows.map((row) => {
            const normalizedRow = [...row];
            while (normalizedRow.length < headers.length) normalizedRow.push('');
            return normalizedRow.slice(0, headers.length);
        }),
    };
}

function calculateColumnWidths(table: TableBlock, maxTableWidth: number): number[] {
    const columnCount = table.headers.length;
    const columns = table.headers.map((header, index) => {
        const values = [header, ...table.rows.map((row) => row[index] ?? '')];
        const maxContentWidth = Math.max(...values.map(visualWidth), MIN_COLUMN_WIDTH);
        const preferredWidth = Math.min(maxContentWidth, MAX_COLUMN_WIDTH);
        const headerWidth = Math.min(Math.max(visualWidth(header), MIN_COLUMN_WIDTH), MAX_COLUMN_WIDTH);
        return {
            minWidth: Math.min(Math.max(headerWidth, MIN_COLUMN_WIDTH), 12),
            preferredWidth: Math.max(preferredWidth, headerWidth),
        };
    });

    const fixedOverhead = columnCount + 1 + columnCount * CELL_PADDING;
    const available = Math.max(columnCount * MIN_COLUMN_WIDTH, maxTableWidth - fixedOverhead);
    const minTotal = columns.reduce((sum, column) => sum + column.minWidth, 0);

    if (minTotal >= available) {
        const baseWidth = Math.max(MIN_COLUMN_WIDTH, Math.floor(available / columnCount));
        let remaining = available - baseWidth * columnCount;
        return columns.map(() => {
            const width = baseWidth + (remaining > 0 ? 1 : 0);
            remaining -= 1;
            return width;
        });
    }

    const widths = columns.map((column) => column.minWidth);
    let remaining = available - minTotal;

    while (remaining > 0) {
        let grew = false;
        for (let index = 0; index < widths.length && remaining > 0; index += 1) {
            if (widths[index] < columns[index].preferredWidth) {
                widths[index] += 1;
                remaining -= 1;
                grew = true;
            }
        }

        if (!grew) break;
    }

    return widths;
}

function renderInline(text: string): React.ReactNode {
    if (!text) return null;
    
    const parts: React.ReactNode[] = [];
    const regex = /(`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|\[[^\]]+\]\([^)]+\))/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            parts.push(text.slice(lastIndex, match.index));
        }

        const token = match[0];
        if (token.startsWith('`')) {
            parts.push(
                <Text key={parts.length} color="yellow">
                    {token.slice(1, -1)}
                </Text>,
            );
        } else if (token.startsWith('[')) {
            const linkText = token.match(/^\[([^\]]+)\]/)?.[1] ?? token;
            parts.push(
                <Text key={parts.length} color="cyan">
                    {linkText}
                </Text>,
            );
        } else {
            parts.push(
                <Text key={parts.length} bold>
                    {token.replace(/^(\*\*|__)/, '').replace(/(\*\*|__)$/, '')}
                </Text>,
            );
        }

        lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
        parts.push(text.slice(lastIndex));
    }

    if (parts.length === 0) {
        return null;
    }

    return parts;
}

function MarkdownTable({ table }: { table: TableBlock }) {
    const widths = calculateColumnWidths(table, terminalWidth() - TABLE_MARGIN);
    const borderWidths = widths.map((width) => width + CELL_PADDING);
    const normalizedRows = table.rows.map((row) => {
        const normalizedRow = [...row];
        while (normalizedRow.length < table.headers.length) normalizedRow.push('');
        return normalizedRow.slice(0, table.headers.length);
    });

    const renderBorder = (type: 'top' | 'middle' | 'bottom') => {
        const chars = {
            top: { left: '┌', middle: '┬', right: '┐' },
            middle: { left: '├', middle: '┼', right: '┤' },
            bottom: { left: '└', middle: '┴', right: '┘' },
        }[type];

        return `${chars.left}${borderWidths.map((width) => '─'.repeat(width)).join(chars.middle)}${chars.right}`;
    };

    const renderRow = (cells: string[], isHeader = false) => {
        const wrappedCells = cells.map((cell, index) => wrapVisual(cell ?? '', widths[index]));
        const height = Math.max(...wrappedCells.map((cell) => cell.length), 1);
        const visualRows: React.ReactNode[] = [];

        for (let lineIndex = 0; lineIndex < height; lineIndex += 1) {
            visualRows.push(
                <Box key={lineIndex} flexDirection="row">
                    <Text color="gray">│</Text>
                    {wrappedCells.map((cell, cellIndex) => {
                        const line = sliceVisual(cell[lineIndex] ?? '', widths[cellIndex]);
                        return (
                            <React.Fragment key={cellIndex}>
                                <Text>
                                    {' '}
                                    {isHeader ? (
                                        <Text bold color="cyan">{padVisual(line, widths[cellIndex])}</Text>
                                    ) : (
                                        <Text>{padVisual(line, widths[cellIndex])}</Text>
                                    )}
                                    {' '}
                                </Text>
                                <Text color="gray">│</Text>
                            </React.Fragment>
                        );
                    })}
                </Box>,
            );
        }

        return visualRows;
    };

    return (
        <Box flexDirection="column" marginY={1}>
            <Text color="gray">{renderBorder('top')}</Text>
            {renderRow(table.headers, true)}
            <Text color="gray">{renderBorder('middle')}</Text>
            {normalizedRows.map((row, index) => (
                <React.Fragment key={index}>{renderRow(row)}</React.Fragment>
            ))}
            <Text color="gray">{renderBorder('bottom')}</Text>
        </Box>
    );
}

export function MarkdownDisplay({ text }: { text: string }) {
    const lines = text.split(/\r?\n/);
    const blocks: React.ReactNode[] = [];
    let inCodeBlock = false;
    let codeLanguage = '';
    let codeLines: string[] = [];

    const flushCodeBlock = (key: string) => {
        blocks.push(
            <Box key={key} flexDirection="column" marginY={1} paddingLeft={2} borderStyle="single" borderColor="gray">
                {codeLanguage ? <Text color="gray">{codeLanguage}</Text> : null}
                {codeLines.length === 0 ? (
                    <Text color="gray"> </Text>
                ) : (
                    codeLines.map((line, index) => (
                        <Text key={index} color="yellow">{line || ' '}</Text>
                    ))
                )}
            </Box>,
        );
        codeLines = [];
        codeLanguage = '';
    };

    for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index];
        const codeFence = line.match(/^\s*```(\w*)\s*$/);

        if (codeFence) {
            if (inCodeBlock) {
                flushCodeBlock(`code-${index}`);
                inCodeBlock = false;
            } else {
                inCodeBlock = true;
                codeLanguage = codeFence[1] || '';
            }
            continue;
        }

        if (inCodeBlock) {
            codeLines.push(line);
            continue;
        }

        if (isTableStart(lines, index)) {
            const headers = splitTableRow(lines[index]);
            const rows: string[][] = [];
            index += 2;

            while (index < lines.length && /^\s*\|.+\|\s*$/.test(lines[index])) {
                rows.push(splitTableRow(lines[index]));
                index += 1;
            }
            index -= 1;

            blocks.push(<MarkdownTable key={`table-${index}`} table={normalizeTable(headers, rows)} />);
            continue;
        }

        const heading = line.match(/^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/);
        if (heading) {
            blocks.push(
                <Box key={index} marginTop={heading[1].length <= 2 ? 1 : 0}>
                    <Text bold color={heading[1].length <= 2 ? 'cyan' : 'white'}>
                        {stripInlineMarkdown(heading[2])}
                    </Text>
                </Box>,
            );
            continue;
        }

        const unordered = line.match(/^\s*[-*+]\s+(.+)$/);
        if (unordered) {
            blocks.push(
                <Box key={index} paddingLeft={2}>
                    <Text color="gray">- </Text>
                    <Text>{renderInline(unordered[1])}</Text>
                </Box>,
            );
            continue;
        }

        const ordered = line.match(/^\s*(\d+)\.\s+(.+)$/);
        if (ordered) {
            blocks.push(
                <Box key={index} paddingLeft={2}>
                    <Text color="gray">{ordered[1]}. </Text>
                    <Text>{renderInline(ordered[2])}</Text>
                </Box>,
            );
            continue;
        }

        const quote = line.match(/^\s*>\s?(.+)$/);
        if (quote) {
            blocks.push(
                <Box key={index} paddingLeft={2}>
                    <Text color="gray">| </Text>
                    <Text color="gray">{renderInline(quote[1])}</Text>
                </Box>,
            );
            continue;
        }

        if (/^\s*([-*_]\s*){3,}$/.test(line)) {
            blocks.push(<Text key={index} color="gray">----------------</Text>);
            continue;
        }

        if (line.trim() === '') {
            blocks.push(<Text key={index}> </Text>);
            continue;
        }

        const inlineRendered = renderInline(line);
        if (inlineRendered) {
            blocks.push(
                <Text key={index} wrap="wrap">
                    {inlineRendered}
                </Text>,
            );
        }
    }

    if (inCodeBlock) {
        flushCodeBlock('code-final');
    }

    return <Box flexDirection="column">{blocks}</Box>;
}

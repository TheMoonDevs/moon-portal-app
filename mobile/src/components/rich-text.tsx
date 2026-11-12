import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, type TextStyle, View } from 'react-native';

import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { portalUrl } from '@/lib/api';
import { openLink } from '@/lib/links';
import type { TiptapNode } from '@/lib/types';

/*
 * A project page, read-only: the Tiptap JSON the website's editor saves
 * (portal/components/screens/Project/DocEditor.tsx and editor/blocks.tsx),
 * drawn with native text. Editing stays on the website for now.
 */

type Props = { doc: TiptapNode | null | undefined; onOpenPage?: (pageId: string) => void };

export function RichText({ doc, onOpenPage }: Props) {
  if (!doc?.content?.length)
    return <ThemedText themeColor="textSecondary">This page is empty.</ThemedText>;
  return (
    <View style={styles.blocks}>
      {doc.content.map((node, i) => (
        <Block key={i} node={node} onOpenPage={onOpenPage} />
      ))}
    </View>
  );
}

const plain = (node: TiptapNode): string =>
  node.text ?? (node.content ?? []).map(plain).join(node.type === 'paragraph' ? '' : ' ');

function Inline({ nodes }: { nodes?: TiptapNode[] }) {
  const theme = useTheme();
  return (
    <>
      {(nodes ?? []).map((n, i) => {
        if (n.type === 'hardBreak') return <Text key={i}>{'\n'}</Text>;
        if (n.type !== 'text') return <Inline key={i} nodes={n.content} />;
        const style: { -readonly [K in keyof TextStyle]: TextStyle[K] } = {};
        let href: string | null = null;
        for (const mark of n.marks ?? []) {
          if (mark.type === 'bold') style.fontWeight = '700';
          if (mark.type === 'italic') style.fontStyle = 'italic';
          if (mark.type === 'underline')
            style.textDecorationLine = style.textDecorationLine === 'line-through' ? 'underline line-through' : 'underline';
          if (mark.type === 'strike')
            style.textDecorationLine = style.textDecorationLine === 'underline' ? 'underline line-through' : 'line-through';
          if (mark.type === 'code') {
            style.fontFamily = Fonts?.mono;
            style.backgroundColor = theme.backgroundSelected;
          }
          if (mark.type === 'link') {
            href = typeof mark.attrs?.href === 'string' ? mark.attrs.href : null;
            style.textDecorationLine = 'underline';
          }
        }
        return (
          <Text key={i} style={style} onPress={href ? () => void openLink(href) : undefined}>
            {n.text}
          </Text>
        );
      })}
    </>
  );
}

function Block({ node, onOpenPage, depth = 0 }: { node: TiptapNode; onOpenPage?: Props['onOpenPage']; depth?: number }) {
  const theme = useTheme();
  const children = (nodes = node.content) =>
    (nodes ?? []).map((n, i) => <Block key={i} node={n} onOpenPage={onOpenPage} depth={depth + 1} />);

  switch (node.type) {
    case 'paragraph':
      if (!node.content?.length) return <View style={styles.spacer} />;
      return (
        <ThemedText>
          <Inline nodes={node.content} />
        </ThemedText>
      );
    case 'heading': {
      const level = Number(node.attrs?.level) || 2;
      return (
        <ThemedText type={level <= 1 ? 'subtitle' : 'default'} style={level > 1 && styles.heading}>
          <Inline nodes={node.content} />
        </ThemedText>
      );
    }
    case 'bulletList':
    case 'orderedList':
    case 'taskList': {
      const start = Number(node.attrs?.start) || 1;
      return (
        <View style={styles.list}>
          {(node.content ?? []).map((item, i) => (
            <View key={i} style={styles.item}>
              {node.type === 'taskList' ? (
                <Icon
                  name={item.attrs?.checked ? 'checkCircle' : 'circle'}
                  size={16}
                  color={item.attrs?.checked ? theme.success : theme.textSecondary}
                />
              ) : (
                <ThemedText themeColor="textSecondary" style={styles.marker}>
                  {node.type === 'orderedList' ? `${start + i}.` : '•'}
                </ThemedText>
              )}
              <View style={styles.flex}>{children(item.content)}</View>
            </View>
          ))}
        </View>
      );
    }
    case 'blockquote':
      return <View style={[styles.quote, { borderColor: theme.border }]}>{children()}</View>;
    case 'callout':
      return (
        <View style={[styles.callout, { backgroundColor: theme.backgroundSelected }]}>
          <ThemedText>{String(node.attrs?.emoji ?? '💡')}</ThemedText>
          <View style={[styles.flex, styles.blocks]}>{children()}</View>
        </View>
      );
    case 'toggle':
      return <Toggle node={node} onOpenPage={onOpenPage} depth={depth} />;
    case 'codeBlock':
      return (
        <View style={[styles.code, { backgroundColor: theme.backgroundSelected }]}>
          <Text style={[styles.mono, { color: theme.text }]}>{plain(node)}</Text>
        </View>
      );
    case 'horizontalRule':
      return <View style={[styles.rule, { backgroundColor: theme.border }]} />;
    case 'image': {
      const src = typeof node.attrs?.src === 'string' ? node.attrs.src : null;
      if (!src) return null;
      return (
        <Image
          source={{ uri: src.startsWith('/') ? portalUrl(src) : src }}
          style={styles.image}
          contentFit="contain"
        />
      );
    }
    case 'embed': {
      const src = typeof node.attrs?.src === 'string' ? node.attrs.src : null;
      if (!src) return null;
      return (
        <Pressable onPress={() => void openLink(src)} style={[styles.embed, { borderColor: theme.border }]}>
          <Icon name="link" size={16} color={theme.textSecondary} />
          <ThemedText type="small" numberOfLines={1} style={styles.flex}>
            {src}
          </ThemedText>
        </Pressable>
      );
    }
    case 'pageLink': {
      const pageId = node.attrs?.pageId as string | undefined;
      return (
        <Pressable
          disabled={!pageId || !onOpenPage}
          onPress={() => pageId && onOpenPage?.(pageId)}
          style={[styles.embed, { borderColor: theme.border }]}>
          <Icon name="page" size={16} color={theme.textSecondary} />
          <ThemedText style={styles.flex}>{String(node.attrs?.title || 'Untitled page')}</ThemedText>
          <Icon name="chevron" size={12} color={theme.textSecondary} />
        </Pressable>
      );
    }
    case 'table':
      return (
        <View style={[styles.table, { borderColor: theme.border }]}>
          {(node.content ?? []).map((row, r) => (
            <View key={r} style={[styles.tableRow, { borderColor: theme.border }]}>
              {(row.content ?? []).map((cell, c) => (
                <View key={c} style={[styles.cell, { borderColor: theme.border }]}>
                  <ThemedText type={cell.type === 'tableHeader' ? 'smallBold' : 'small'}>
                    {plain(cell)}
                  </ThemedText>
                </View>
              ))}
            </View>
          ))}
        </View>
      );
    case 'tableOfContents':
    case 'trailingLine':
      return null;
    default:
      // Anything new from the website: its words, at least.
      return node.content?.length ? <View style={styles.blocks}>{children()}</View> : null;
  }
}

function Toggle({ node, onOpenPage, depth }: { node: TiptapNode; onOpenPage?: Props['onOpenPage']; depth: number }) {
  const theme = useTheme();
  const [open, setOpen] = useState(node.attrs?.open !== false);
  const summary = node.content?.find((n) => n.type === 'toggleSummary');
  const body = node.content?.find((n) => n.type === 'toggleBody');
  return (
    <View style={styles.blocks}>
      <Pressable onPress={() => setOpen(!open)} style={styles.item}>
        <View style={{ transform: [{ rotate: open ? '90deg' : '0deg' }] }}>
          <Icon name="chevron" size={12} color={theme.textSecondary} />
        </View>
        <ThemedText type="smallBold" style={styles.flex}>
          <Inline nodes={summary?.content} />
        </ThemedText>
      </Pressable>
      {open ? (
        <View style={[styles.toggleBody, styles.blocks]}>
          {(body?.content ?? []).map((n, i) => (
            <Block key={i} node={n} onOpenPage={onOpenPage} depth={depth + 1} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  blocks: { gap: Spacing.two },
  spacer: { height: Spacing.one },
  heading: { fontWeight: '700', fontSize: 18, marginTop: Spacing.two },
  list: { gap: Spacing.one },
  item: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  marker: { minWidth: 16 },
  quote: { borderLeftWidth: 3, paddingLeft: Spacing.three, gap: Spacing.two },
  callout: { flexDirection: 'row', gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.medium },
  code: { padding: Spacing.three, borderRadius: Radius.small },
  mono: { fontFamily: Fonts?.mono, fontSize: 13, lineHeight: 18 },
  rule: { height: StyleSheet.hairlineWidth, marginVertical: Spacing.two },
  image: { width: '100%', aspectRatio: 16 / 10, borderRadius: Radius.medium },
  embed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.medium,
    padding: Spacing.three,
  },
  table: { borderWidth: StyleSheet.hairlineWidth, borderRadius: Radius.small, overflow: 'hidden' },
  tableRow: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth },
  cell: { flex: 1, padding: Spacing.two, borderRightWidth: StyleSheet.hairlineWidth },
  toggleBody: { paddingLeft: Spacing.four },
});

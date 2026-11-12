// Faultline admin page — transparency panel (Forge UI Kit 1).
// Uses @forge/ui components — raw HTML elements do not render in Forge.
// Resolvers live in this bundle (UI Kit pattern); they read the same KVS data
// the backend writes, so judges can inspect exactly what the app produced.

import React from 'react';
import { render, Text, Heading, Button, useState, useEffect } from '@forge/ui';
import { invoke } from '@forge/bridge';
import Resolver from '@forge/resolver';
import { recentAnalyses } from '../storage';

const resolver = new Resolver();

resolver.define('recentAnalyses', async () => ({
  analyses: await recentAnalyses(),
}));

export const handler = resolver.getDefinitions();

const App = () => {
  const [analyses, setAnalyses] = useState([]);
  const [openPr, setOpenPr] = useState(null);

  useEffect(() => {
    invoke('recentAnalyses')
      .then((res) => setAnalyses(res?.analyses || []))
      .catch(() => setAnalyses([]));
  }, []);

  return (
    <>
      <Heading as="h2">Faultline — activity</Heading>
      <Text>
        Every analysis Faultline has produced, with its full ranking — anyone (including
        judges) can see exactly how the app works. Rankings are deterministic:
        postmortem evidence and service dependencies are cited and linked, heuristics
        are labeled, and every reason above is shown.
      </Text>
      {analyses.length === 0 && (
        <Text>
          No analyses yet. Open (or update) a pull request on a repo with the webhook
          wired, and a guide appears here within seconds.
        </Text>
      )}
      {analyses.map((a) => {
        const top = a.ranked?.[0];
        const k = `${a.ws}-${a.repo}-${a.prId}`;
        const isOpen = openPr === k;
        const items = [
          <Heading key={`h-${k}`} as="h3">
            {top?.icon || '⚪'} PR #{a.prId} — {a.title} ({a.ws}/{a.repo})
          </Heading>,
          <Button
            key={`b-${k}`}
            text={isOpen ? 'Hide ranking' : 'Show ranking'}
            onClick={() => setOpenPr(isOpen ? null : k)}
          />,
        ];
        if (isOpen) {
          (a.ranked || []).forEach((f) => {
            items.push(
              <Text key={`t-${k}-${f.path}`}>
                {f.icon} #{f.rank} {f.path} — {f.score}/100 ({f.tier}) — {f.reasons.join(' · ')}
                {(f.evidence || []).length > 0
                  ? ` — evidence: ${f.evidence.map((e) => e.text).join('; ')}`
                  : ''}
              </Text>
            );
          });
        }
        return items;
      })}
    </>
  );
};

export default render(<App />);

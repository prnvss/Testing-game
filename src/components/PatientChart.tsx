import {Badge} from '@astryxdesign/core/Badge';
import {Divider} from '@astryxdesign/core/Divider';
import {Icon} from '@astryxdesign/core/Icon';
import {Item} from '@astryxdesign/core/Item';
import {HStack, VStack} from '@astryxdesign/core/Layout';
import {List} from '@astryxdesign/core/List';
import {Text} from '@astryxdesign/core/Text';
import {Lock, Stethoscope, User} from 'lucide-react';
import type {Case} from '../data/types';

function Block({title, items}: {title: string; items?: string[]}) {
  if (!items || items.length === 0) return null;
  return (
    <VStack gap={0.5}>
      <Text type="label" weight="semibold" color="secondary">
        {title}
      </Text>
      <List listStyle="disc" density="compact">
        {items.map(i => (
          <Item key={i} as="li" density="compact" label={<Text>{i}</Text>} />
        ))}
      </List>
    </VStack>
  );
}

export function PatientChart({c, showExam}: {c: Case; showExam: boolean}) {
  const p = c.patient;
  return (
    <VStack gap={3}>
      <VStack gap={1}>
        <HStack gap={1} vAlign="center">
          <Icon icon={User} size="sm" color="accent" />
          <Text weight="semibold">{p.name}</Text>
        </HStack>
        <HStack gap={1} wrap="wrap">
          <Badge label={p.id} />
          <Badge label={`${p.age} ${p.sex === 'F' ? 'female' : 'male'}`} />
          {p.background && <Badge label={p.background} />}
          {p.occupation && <Badge label={p.occupation} />}
        </HStack>
      </VStack>

      <VStack gap={1}>
        <Text type="label" weight="semibold" color="accent">
          Presenting complaint
        </Text>
        <Text type="large">{p.complaint}</Text>
        <Text type="supporting">{p.summary}</Text>
      </VStack>

      <Divider />
      <Block title="History of presenting complaint" items={p.history} />
      <Block title="Medical history" items={p.medicalHistory} />
      <Block title="Medications" items={p.medications} />
      <Block title="Ocular history" items={p.ocularHistory} />
      <Block title="Family history" items={p.familyHistory} />
      <Divider />

      <VStack gap={1}>
        <HStack gap={1} vAlign="center">
          <Icon icon={showExam ? Stethoscope : Lock} size="sm" color={showExam ? 'accent' : 'secondary'} />
          <Text type="label" weight="semibold" color={showExam ? 'accent' : 'secondary'}>
            Examination findings
          </Text>
        </HStack>
        {showExam ? (
          <List hasDividers density="compact">
            {c.exam.map(e => (
              <Item key={e.label} density="compact" label={<Text type="supporting">{e.label}</Text>} description={<Text>{e.value}</Text>} />
            ))}
          </List>
        ) : (
          <Text type="supporting">Unlocks after your differentials and history/tests answer.</Text>
        )}
      </VStack>
    </VStack>
  );
}

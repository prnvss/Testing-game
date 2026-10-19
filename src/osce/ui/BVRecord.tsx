import {Card} from '@astryxdesign/core/Card';
import {VStack} from '@astryxdesign/core/Layout';
import {RadioList, RadioListItem} from '@astryxdesign/core/RadioList';
import {Text} from '@astryxdesign/core/Text';
import {TextArea} from '@astryxdesign/core/TextArea';
import type {BVPatient} from '../patient';
import type {RecordProps} from '../types';

export interface BVRec {
  text: string;
  interp: string;
}

export interface InterpOption {
  id: string;
  text: string;
}

export const initBVRec = (): BVRec => ({text: '', interp: ''});

/** Record-card line + "what does it mean" for a BV test. */
export function makeBVRecord<S>(opts: {placeholder: string; hint: string; question: string; options: InterpOption[]}) {
  return function BVRecordForm({rec, setRec, isLocked}: RecordProps<BVPatient, S, BVRec>) {
    return (
      <VStack gap={2}>
        <TextArea
          label="Record on the clinical record card"
          rows={3}
          value={rec.text}
          isReadOnly={isLocked}
          placeholder={opts.placeholder}
          description={opts.hint}
          onChange={v => setRec(r => ({...r, text: v}))}
        />
        <Card variant="muted" padding={2}>
          <VStack gap={1}>
            <Text type="label" weight="semibold">
              Interpretation · {opts.question}
            </Text>
            <RadioList label={opts.question} isLabelHidden value={rec.interp} isDisabled={isLocked} onChange={v => setRec(r => ({...r, interp: v}))}>
              {opts.options.map(o => (
                <RadioListItem key={o.id} value={o.id} label={o.text} />
              ))}
            </RadioList>
          </VStack>
        </Card>
      </VStack>
    );
  };
}

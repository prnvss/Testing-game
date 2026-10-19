import type {AnyTest} from '../types';
import {pushUpTest, minusLensTest} from './aoa';
import {coverTest} from './cover';
import {maddoxTest, vergBarTest, vergPhoropterTest, vonGraefeTest} from './distance';
import {bafTest, mafTest} from './facility';
import {memTest} from './mem';
import {npcTest} from './npc';
import {nottTest} from './nott';
import {praNraTest} from './relacc';

export const BV_TESTS: AnyTest[] = [
  memTest,
  nottTest,
  pushUpTest,
  minusLensTest,
  praNraTest,
  bafTest,
  mafTest,
  coverTest,
  npcTest,
  vonGraefeTest,
  maddoxTest,
  vergPhoropterTest,
  vergBarTest,
];

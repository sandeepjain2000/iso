export type EvidenceNode = {
  id: number;
  name: string;
  desc: string | null;
  url: string | null;
  include: boolean;
  effective: boolean;
};

export type Level2Node = {
  id: number;
  name: string;
  desc: string | null;
  include: boolean;
  effective: boolean;
  evidence: EvidenceNode[];
};

export type Level1Node = {
  id: number;
  name: string;
  desc: string | null;
  include: boolean;
  effective: boolean;
  risk_description: string | null;
  inherent_likelihood: string | null;
  residual_likelihood: string | null;
  inherent_impact: string | null;
  residual_impact: string | null;
  level2: Level2Node[];
};

export type CategoryNode = {
  id: number;
  name: string;
  desc: string | null;
  include: boolean;
  effective: boolean;
  level1: Level1Node[];
};

export type DocumentTree = {
  id: number;
  name: string;
  desc: string | null;
  include: boolean;
  effective: boolean;
  categories: CategoryNode[];
};

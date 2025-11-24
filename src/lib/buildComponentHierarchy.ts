type ComponentType =
  | "Domain"
  | "Initiative"
  | "Epic"
  | "Feature"
  | "User Story";

interface BaseComponent {
  _id: string;
  name: string;
  type: ComponentType;
  parent: string | null;
  [key: string]: any;
}

interface Domain extends BaseComponent {
  type: "Domain";
  parent: null | string;
  children?: Initiative[];
}

interface Initiative extends BaseComponent {
  type: "Initiative";
  parent: string;
  children?: Epic[];
}

interface Epic extends BaseComponent {
  type: "Epic";
  parent: string;
  children?: Feature[];
}

interface Feature extends BaseComponent {
  type: "Feature";
  parent: string;
  children?: UserStory[];
}

interface UserStory extends BaseComponent {
  type: "User Story"; // FIXED
  parent: string;
  children?: never;
}
export type Component = Domain | Initiative | Epic | Feature | UserStory;

export function buildHierarchy(
  components: Component[],
  rootWorkspaceId: string
) {
  const map = new Map<string, Component>();

  // Populate map with all components, initializing children arrays
  components.forEach((c) => {
    if (c.type === "Domain") (c as Domain).children = [];
    else if (c.type === "Initiative") (c as Initiative).children = [];
    else if (c.type === "Epic") (c as Epic).children = [];
    else if (c.type === "Feature") (c as Feature).children = [];
    map.set(c._id, c);
  });

  const hierarchy: Domain[] = [];

  // Step 1: Domains
  components
    .filter(
      (c) => c.type === "Domain" && (!c.parent || c.parent === rootWorkspaceId)
    )
    .forEach((d) => hierarchy.push(d as Domain));

  // Step 2: Initiatives
  components
    .filter((c) => c.type === "Initiative")
    .forEach((i) => {
      const parent = map.get(i.parent!);
      if (!parent || parent.type !== "Domain")
        throw new Error(
          `Initiative ${i._id} cannot have parent ${parent?.type}`
        );
      (parent.children as Initiative[]).push(i as Initiative);
    });

  // Step 3: Epics
  components
    .filter((c) => c.type === "Epic")
    .forEach((e) => {
      const parent = map.get(e.parent!);
      if (!parent || parent.type !== "Initiative")
        throw new Error(`Epic ${e._id} cannot have parent ${parent?.type}`);
      (parent.children as Epic[]).push(e as Epic);
    });

  // Step 4: Features
  components
    .filter((c) => c.type === "Feature")
    .forEach((f) => {
      const parent = map.get(f.parent!);
      if (!parent || parent.type !== "Epic")
        throw new Error(`Feature ${f._id} cannot have parent ${parent?.type}`);
      (parent.children as Feature[]).push(f as Feature);
    });

  // Step 5: User Stories
  components
    .filter((c) => c.type === "User Story")
    .forEach((u) => {
      const parent = map.get(u.parent!);
      if (!parent || parent.type !== "Feature")
        throw new Error(
          `User Story ${u._id} cannot have parent ${parent?.type}`
        );
      (parent.children as UserStory[]).push(u as UserStory);
    });

  return hierarchy;
}

type ComponentType = "Domain" | "Initiative" | "Epic" | "Feature" | "User Story";
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
    type: "User Story";
    parent: string;
    children?: never;
}
export type Component = Domain | Initiative | Epic | Feature | UserStory;
export declare function buildHierarchy(components: Component[], rootWorkspaceId: string): Domain[];
export {};
//# sourceMappingURL=buildComponentHierarchy.d.ts.map
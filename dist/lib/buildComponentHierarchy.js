"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildHierarchy = buildHierarchy;
function buildHierarchy(components, rootWorkspaceId) {
    const map = new Map();
    // Populate map with all components, initializing children arrays
    components.forEach((c) => {
        if (c.type === "Domain")
            c.children = [];
        else if (c.type === "Initiative")
            c.children = [];
        else if (c.type === "Epic")
            c.children = [];
        else if (c.type === "Feature")
            c.children = [];
        map.set(c._id, c);
    });
    const hierarchy = [];
    // Step 1: Domains
    components
        .filter((c) => c.type === "Domain" && (!c.parent || c.parent === rootWorkspaceId))
        .forEach((d) => hierarchy.push(d));
    // Step 2: Initiatives
    components
        .filter((c) => c.type === "Initiative")
        .forEach((i) => {
        const parent = map.get(i.parent);
        if (!parent || parent.type !== "Domain")
            throw new Error(`Initiative ${i._id} cannot have parent ${parent?.type}`);
        parent.children.push(i);
    });
    // Step 3: Epics
    components
        .filter((c) => c.type === "Epic")
        .forEach((e) => {
        const parent = map.get(e.parent);
        if (!parent || parent.type !== "Initiative")
            throw new Error(`Epic ${e._id} cannot have parent ${parent?.type}`);
        parent.children.push(e);
    });
    // Step 4: Features
    components
        .filter((c) => c.type === "Feature")
        .forEach((f) => {
        const parent = map.get(f.parent);
        if (!parent || parent.type !== "Epic")
            throw new Error(`Feature ${f._id} cannot have parent ${parent?.type}`);
        parent.children.push(f);
    });
    // Step 5: User Stories
    components
        .filter((c) => c.type === "User Story")
        .forEach((u) => {
        const parent = map.get(u.parent);
        if (!parent || parent.type !== "Feature")
            throw new Error(`User Story ${u._id} cannot have parent ${parent?.type}`);
        parent.children.push(u);
    });
    return hierarchy;
}
//# sourceMappingURL=buildComponentHierarchy.js.map
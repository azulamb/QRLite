import { createInfo } from "./info_builder.ts";

// ES modules are evaluated once, so all derived tables are built only when the
// library is first loaded and are reused by every Generator instance.
export const Info = createInfo();

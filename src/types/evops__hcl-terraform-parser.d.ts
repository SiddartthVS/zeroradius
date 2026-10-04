declare module '@evops/hcl-terraform-parser' {
  export interface HCLProvider {
    name?: string;
    alias?: string;
  }

  export interface HCLPosition {
    filename?: string;
    line?: number;
    column?: number;
  }

  export interface HCLManagedResource {
    mode:     'managed';
    type:     string;
    name:     string;
    provider: HCLProvider;
    pos?:     HCLPosition;
  }

  export interface HCLDataResource {
    mode:     'data';
    type:     string;
    name:     string;
    provider: HCLProvider;
    pos?:     HCLPosition;
  }

  export interface HCLModuleCall {
    name:   string;
    source: string;
    pos?:   HCLPosition;
  }

  export interface HCLParseResult {
    path:              string;
    variables:         Record<string, unknown>;
    outputs:           Record<string, unknown>;
    required_providers: Record<string, unknown>;
    managed_resources: Record<string, HCLManagedResource>;
    data_resources:    Record<string, HCLDataResource>;
    module_calls:      Record<string, HCLModuleCall>;
  }

  /** Parse a Terraform HCL string and return the module structure. */
  export function parse(hcl: string): HCLParseResult;
}

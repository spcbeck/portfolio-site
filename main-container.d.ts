import { LitElement } from "lit";
/**
 * An example element.
 *
 * @fires count-changed - Indicates when the count changes
 * @slot - This element has a slot
 * @csspart button - The button
 */
export declare class MainContainer extends LitElement {
    static styles: import("lit").CSSResult;
    render(): import("lit-html").TemplateResult<1>;
    /**
     * Formats a greeting
     * @param name The name to say "Hello" to
     */
    sayHello(name: string): string;
}
declare global {
    interface HTMLElementTagNameMap {
        "main-container": MainContainer;
    }
}
//# sourceMappingURL=main-container.d.ts.map
import { getPrintSizes } from "src/lib/prints";
import { CONTENT_DEFAULTS } from "src/lib/content-keys";

export default function PrintDetails({
  spec,
  edition,
  content,
}: {
  spec: string;
  edition: string;
  content: Record<string, string>;
}) {
  const sizes = getPrintSizes(spec);
  const copy = (key: string) =>
    content[`prints.details.${key}`] ??
    CONTENT_DEFAULTS[`prints.details.${key}`];

  return (
    <div className="text-stone-2 mt-[9px] text-[15px] leading-[1.8] whitespace-pre-line">
      <p className="text-ink">{copy("heading")}</p>
      <dl className="mt-2">
        <div>
          <dt className="inline">{copy("paperLabel")} </dt>
          <dd className="inline">{copy("paper")}</dd>
        </div>
        <div>
          <dt className="inline">{copy("editionLabel")} </dt>
          <dd className="inline">{edition}</dd>
        </div>
        <div>
          <dt className="inline">{copy("imageSizeLabel")} </dt>
          <dd className="inline">{sizes?.image ?? copy("unknownSize")}</dd>
        </div>
        <div>
          <dt className="inline">{copy("paperSizeLabel")} </dt>
          <dd className="inline">{sizes?.paper ?? copy("unknownSize")}</dd>
        </div>
        <div>
          <dt className="inline">{copy("borderLabel")} </dt>
          <dd className="inline">{copy("border")}</dd>
        </div>
      </dl>
      <ul className="mt-2">
        <li>{copy("signed")}</li>
        <li>{copy("numbered")}</li>
        <li>{copy("certificate")}</li>
        <li>{copy("framing")}</li>
      </ul>
      <p className="mt-2">{copy("sizeExplanation")}</p>
    </div>
  );
}

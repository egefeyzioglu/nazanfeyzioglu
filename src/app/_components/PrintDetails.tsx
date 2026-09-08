import { getPrintSizes } from "src/lib/prints";

export default function PrintDetails({ spec }: { spec: string }) {
  const sizes = getPrintSizes(spec);

  return (
    <div className="text-stone-2 mt-[9px] text-[15px] leading-[1.8]">
      <p className="text-ink">Fine Art Giclée Print</p>
      <dl className="mt-2">
        <div>
          <dt className="inline">Paper: </dt>
          <dd className="inline">Epson Hot Press Bright White</dd>
        </div>
        <div>
          <dt className="inline">Edition: </dt>
          <dd className="inline">Limited Edition of 20</dd>
        </div>
        <div>
          <dt className="inline">Image Size: </dt>
          <dd className="inline">{sizes?.image ?? "To be confirmed"}</dd>
        </div>
        <div>
          <dt className="inline">Overall Paper Size: </dt>
          <dd className="inline">{sizes?.paper ?? "To be confirmed"}</dd>
        </div>
        <div>
          <dt className="inline">White Border: </dt>
          <dd className="inline">2 in on all sides</dd>
        </div>
      </dl>
      <ul className="mt-2">
        <li>Hand-signed by the artist</li>
        <li>Individually numbered</li>
        <li>Certificate of Authenticity included</li>
        <li>Unframed</li>
      </ul>
      <p className="mt-2">
        Image Size is the size of the printed artwork. Overall Paper Size
        includes the 2-inch white border on all sides.
      </p>
    </div>
  );
}

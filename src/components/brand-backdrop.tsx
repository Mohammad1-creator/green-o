import { getImageProps } from "next/image";

/**
 * The green brand picture, fixed behind the page: the tall version on
 * phones, the wide one from tablet width up. It sits under the page's
 * content and chrome (do not wrap it in a positioned or `isolate` element,
 * or it will cover the header and sidebar).
 */
export function BrandBackdrop() {
  const common = {
    alt: "",
    sizes: "100vw",
    quality: 75,
    loading: "eager" as const,
  };
  const {
    props: { srcSet: desktop },
  } = getImageProps({
    ...common,
    src: "/brand/green-desktop.png",
    width: 1920,
    height: 1080,
  });
  const {
    props: { srcSet: phone, ...rest },
  } = getImageProps({
    ...common,
    src: "/brand/green-phone.png",
    width: 1080,
    height: 2340,
  });

  return (
    <picture className="pointer-events-none fixed inset-0 -z-10">
      <source media="(min-width: 768px)" srcSet={desktop} />
      <img
        {...rest}
        srcSet={phone}
        alt=""
        className="size-full bg-[#14573a] object-cover"
      />
    </picture>
  );
}

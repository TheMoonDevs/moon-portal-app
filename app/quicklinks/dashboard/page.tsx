import { QuicklinksDashboard } from "@/components/screens/Quicklinks/screens/QuicklinksDashboard/QuicklinksDashboard";

// const getTopUsedLinks = cache(async () => {
//   try {
//     const topUsedLinks = QuicklinksSdk.getData(
//       "${APP_BASE_URL}/api/quicklinks/link/top-used"
//     );
//     return topUsedLinks;
//   } catch (e) {
//     console.log(e);
//     return null;
//   }
// });

// export const revalidate = 60;

export default async function Home() {
  // let topUsedLinks = await getTopUsedLinks();
  // if (!topUsedLinks) {
  //   topUsedLinks = [];
  // }
  return <QuicklinksDashboard />;
}

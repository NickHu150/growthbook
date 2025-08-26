import { Box, Heading, Text } from "@radix-ui/themes";
import MetricCorrelations from "@/enterprise/components/Insights/MetricCorrelations";

const MetricCorrelationsPage = (): React.ReactElement => {
  return (
    <Box className="contents container-fluid pagecontents my-3">
      <Heading>指标关联</Heading>
      <Box mb="2">
        <Text>查看两个指标如何共同受到实验的影响。</Text>
      </Box>
      <MetricCorrelations />
    </Box>
  );
};

export default MetricCorrelationsPage;

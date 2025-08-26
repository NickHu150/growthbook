import { useEffect, useState } from "react";
import { GithubIntegrationInterface } from "back-end/types/github";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useAuth } from "@/services/auth";
export default function GithubIntegrationConnect({
  code,
  refresh,
}: {
  code: string;
  refresh: () => void;
}) {
  const { apiCall } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) return;
    apiCall<{ githubIntegration: GithubIntegrationInterface }>(
      "/integrations/github",
      {
        method: "POST",
        body: JSON.stringify({
          code,
        }),
      },
    )
      .then(() => refresh())
      .catch((e) => {
        setError(e.message);
      });
  }, [apiCall, code, refresh]);

  if (!code) {
    return (
      <div>
        <p>
          GitHub 集成将允许您访问一些很酷的功能，例如{" "}
          <strong>功能标志代码参考</strong> 以帮助识别功能标志在代码库中的使用位置。
        </p>
        <a href="https://github.com/apps/growthbook-github-integration/installations/new">
          安装 GitHub 集成
        </a>
      </div>
    );
  }

  if (error)
    return (
      <div>
        <p>连接您的 GitHub 帐户时出错：</p>
        <pre>{error}</pre>
      </div>
    );

  return (
    <div>
      <LoadingSpinner /> 正在将您的 GrowthBook 帐户连接到 GitHub...
    </div>
  );
}

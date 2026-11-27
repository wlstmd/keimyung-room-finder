const MAX_UPDATE_ATTEMPTS = 5;

function readCount(value, name) {
  const count = Number(value ?? 0);
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new Error(`Visitor counter has an invalid ${name} value.`);
  }
  return count;
}

export function getSeoulDate(now = new Date()) {
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new TypeError("Visitor counter date must be a valid Date.");
  }

  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(now)
      .map(({ type, value }) => [type, value]),
  );

  return `${parts.year}-${parts.month}-${parts.day}`;
}

export async function incrementPageView(client, now = new Date()) {
  const date = getSeoulDate(now);

  for (let attempt = 0; attempt < MAX_UPDATE_ATTEMPTS; attempt += 1) {
    const configMap = await client.get();
    const metadata = configMap?.metadata;
    if (!metadata?.name || !metadata.namespace || !metadata.resourceVersion) {
      throw new Error("Visitor counter ConfigMap is missing required metadata.");
    }

    const total = readCount(configMap.data?.total, "total") + 1;
    const today =
      (configMap.data?.date === date
        ? readCount(configMap.data?.today, "today")
        : 0) + 1;
    const nextConfigMap = {
      apiVersion: "v1",
      kind: "ConfigMap",
      metadata: {
        name: metadata.name,
        namespace: metadata.namespace,
        resourceVersion: metadata.resourceVersion,
        ...(metadata.labels ? { labels: metadata.labels } : {}),
        ...(metadata.annotations ? { annotations: metadata.annotations } : {}),
      },
      data: {
        date,
        today: String(today),
        total: String(total),
      },
    };

    try {
      await client.update(nextConfigMap);
      return { today, total };
    } catch (error) {
      if (error?.statusCode !== 409) throw error;
      if (attempt === MAX_UPDATE_ATTEMPTS - 1) {
        throw new Error("Visitor counter could not be updated after concurrent writes.", {
          cause: error,
        });
      }
      await new Promise((resolve) => setTimeout(resolve, 10 * (attempt + 1)));
    }
  }

  throw new Error("Visitor counter could not be updated.");
}

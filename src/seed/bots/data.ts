import interestCategories from '../interests/data';

// Bot configurations for each interest category
export const botConfigs = interestCategories.map((category) => {
  // Extract keywords from topics
  const keywords = category.topics.map(topic => topic.name.toLowerCase());

  // Add category name as primary keyword
  keywords.unshift(category.name.toLowerCase());

  return {
    username: `${category.id}_bot`,
    displayName: `${category.emoji} ${category.name} Bot`,
    bio: `Curating the best ${category.name.toLowerCase()} content for you`,
    interestCategory: category.name,
    categoryId: category.id,
    emoji: category.emoji,
    config: {
      postingFrequency: 'daily' as const,
      maxPostsPerDay: 3,
      autoPostEnabled: true,
      dataSources: [] as string[],
      keywords,
      hashtags: [category.id, ...category.topics.map(t => t.id)]
    }
  };
});

export default botConfigs;

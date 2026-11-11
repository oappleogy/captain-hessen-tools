const pages=["modes", "markets", "chain", "holders", "crisis", "framework"];const target=location.hash.slice(1);if(pages.includes(target))location.replace('./'+target+'.html');

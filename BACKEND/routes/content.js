// routes/content.js
const express = require('express');
const router = express.Router();
const { Content, Model, UserHistory, sequelize } = require('../models');
const { Op } = require('sequelize');
const slugify = require('slugify');
const encryptionService = require('../utils/encryption');

// util: slug = <slug-da-modelo>-<slug-do-título>(-<contador> quando houver repetição do título para a mesma modelo)
async function generateContentSlug(modelName, contentTitle, modelId) {
  const modelSlug = slugify(modelName, { lower: true, strict: true });
  const titleSlug = slugify(contentTitle, { lower: true, strict: true });

  // Conta quantos conteúdos já existem com mesmo model_id e mesmo título
  const existingCount = await Content.count({
    where: { model_id: modelId, title: contentTitle }
  });

  const base = `${modelSlug}-${titleSlug}`;
  return existingCount > 0 ? `${base}-${existingCount + 1}` : base;
}

// Helper function to group content by date
async function getContentByDateGroups(page, filters = {}) {
  const daysToSkip = (page - 1) * 30;
  
  // Get distinct dates with content count, ordered by date desc
  const dateQuery = `
    SELECT DATE(COALESCE("postdate", "createdAt")) as post_date, COUNT(*) as content_count
    FROM "Contents" 
    WHERE "isActive" = true AND "status" = 'active'
    ${filters.ethnicity ? `AND EXISTS (
      SELECT 1 FROM "Models" m 
      WHERE m."model_id" = "Contents"."model_id" 
      AND m."ethnicity" = '${filters.ethnicity}'
    )` : ''}
    ${filters.category ? `AND "tags" @> '["${filters.category}"]'` : ''}
    GROUP BY DATE(COALESCE("postdate", "createdAt"))
    ORDER BY DATE(COALESCE("postdate", "createdAt")) DESC
    LIMIT 30 OFFSET ${daysToSkip}
  `;
  
  const dateResults = await sequelize.query(dateQuery, {
    type: sequelize.QueryTypes.SELECT
  });
  
  if (dateResults.length === 0) {
    return { contentGroups: [], hasMoreContent: false };
  }
  
  const dates = dateResults.map(r => r.post_date);
  
  // Get all content for these dates
  const where = {
    isActive: true,
    status: 'active',
    [Op.or]: [
      {
        postdate: {
          [Op.and]: [
            sequelize.where(sequelize.fn('DATE', sequelize.col('Content.postdate')), {
              [Op.in]: dates
            })
          ]
        }
      },
      {
        postdate: { [Op.is]: null },
        createdAt: {
          [Op.and]: [
            sequelize.where(sequelize.fn('DATE', sequelize.col('Content.createdAt')), {
              [Op.in]: dates
            })
          ]
        }
      }
    ]
  };
  
  // Remove the old createdAt filter since we're using the OR condition above
  /*
  const where = {
    isActive: true,
    status: 'active',
    createdAt: {
      [Op.and]: [
        sequelize.where(sequelize.fn('DATE', sequelize.col('Content.createdAt')), {
          [Op.in]: dates
        })
      ]
    }
  };
  */
  
  if (filters.category) {
    where.tags = { [Op.contains]: [filters.category] };
  }
  
  const includeModel = {
    model: Model,
    as: 'model',
    attributes: ['id', 'model_id', 'name', 'slug', 'photoUrl'],
    required: true
  };
  
  if (filters.ethnicity) {
    includeModel.where = { ethnicity: filters.ethnicity };
  }
  
  const contents = await Content.findAll({
    where,
    include: [includeModel],
    order: [[sequelize.fn('COALESCE', sequelize.col('postdate'), sequelize.col('createdAt')), 'DESC']]
  });
  
  // Group by date
  const contentGroups = dates.map(date => {
    const dayContents = contents.filter(content => {
      const postDate = content.postdate || content.createdAt;
      const contentDate = new Date(postDate).toISOString().split('T')[0];
      return contentDate === date;
    });
    
    return {
      date,
      contents: dayContents,
      count: dayContents.length
    };
  });
  
  // Check if there are more days
  const nextPageQuery = `
    SELECT COUNT(DISTINCT DATE(COALESCE("postdate", "createdAt"))) as total_days
    FROM "Contents" 
    WHERE "isActive" = true AND "status" = 'active'
    ${filters.ethnicity ? `AND EXISTS (
      SELECT 1 FROM "Models" m 
      WHERE m."model_id" = "Contents"."model_id" 
      AND m."ethnicity" = '${filters.ethnicity}'
    )` : ''}
    ${filters.category ? `AND "tags" @> '["${filters.category}"]'` : ''}
    AND DATE(COALESCE("postdate", "createdAt")) < '${dates[dates.length - 1]}'
  `;
  
  const nextPageResult = await sequelize.query(nextPageQuery, {
    type: sequelize.QueryTypes.SELECT
  });
  
  const hasMoreContent = nextPageResult[0]?.total_days > 0;
  
  return { contentGroups, hasMoreContent };
}

// Get available categories from content
async function getAvailableCategories(filters = {}) {
  const where = {
    isActive: true,
    status: 'active',
    tags: { [Op.ne]: null }
  };
  
  const includeModel = {
    model: Model,
    as: 'model',
    required: true
  };
  
  if (filters.ethnicity) {
    includeModel.where = { ethnicity: filters.ethnicity };
  }
  
  const contents = await Content.findAll({
    where,
    include: [includeModel],
    attributes: ['tags']
  });
  
  const allTags = new Set();
  contents.forEach(content => {
    if (content.tags && Array.isArray(content.tags)) {
      content.tags.forEach(tag => allTags.add(tag));
    }
  });
  
  return Array.from(allTags).sort();
}

// New route for date-based pagination
router.get('/by-date', async (req, res) => {
  try {
    const {
      page = 1,
      ethnicity,
      category
    } = req.query;
    
    const filters = {};
    if (ethnicity) filters.ethnicity = ethnicity;
    if (category) filters.category = category;
    
    const { contentGroups, hasMoreContent } = await getContentByDateGroups(parseInt(page), filters);
    
    res.json({
      contentGroups,
      hasMoreContent,
      currentPage: parseInt(page)
    });
  } catch (error) {
    console.error('Error fetching content by date:', error);
    res.status(500).json({ error: 'Error fetching content by date', details: error.message });
  }
});

// Get available categories
router.get('/categories', async (req, res) => {
  try {
    const { ethnicity } = req.query;
    const filters = {};
    if (ethnicity) filters.ethnicity = ethnicity;
    
    const categories = await getAvailableCategories(filters);
    
    res.json({ categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Error fetching categories', details: error.message });
  }
});

// Listar todos os conteúdos
router.get('/', async (req, res) => {
  try {
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 20);
    const sortBy = req.query.sortBy || 'recent';
    const search = req.query.search;

    const offset = (page - 1) * limit;
    const where = { isActive: true, status: 'active' };
    let order = [];

    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { '$model.name$': { [Op.iLike]: `%${search}%` } }
      ];
    }

    switch (sortBy) {
      case 'popular': order = [['views', 'DESC']]; break;
      case 'oldest': order = [['createdAt', 'ASC']]; break;
      default: order = [['createdAt', 'DESC']]; break;
    }

    const { count, rows } = await Content.findAndCountAll({
      where,
      order,
      limit,
      offset,
      include: [{
        model: Model,
        as: 'model',
        attributes: ['id', 'model_id', 'name', 'slug', 'photoUrl'],
        required: true
      }]
    });

    res.json({
      contents: rows,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    console.error('Erro ao buscar conteúdos:', error);
    res.status(500).json({ error: 'Erro ao buscar conteúdos', details: error.message });
  }
});

// Listar conteúdos por modelo
router.get('/model/:model_id', async (req, res) => {
  try {
    const { model_id } = req.params;
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 20);
    const sortBy = req.query.sortBy || 'recent';
    const type = req.query.type;
    const tags = req.query.tags;

    const model = await Model.findOne({ where: { model_id: model_id } });
    if (!model) return res.status(404).json({ error: 'Modelo não encontrado' });

    const offset = (page - 1) * limit;
    const where = { model_id: model_id, isActive: true, status: 'active' };
    let order = [];

    if (type) where.type = type;
    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      where.tags = { [Op.overlap]: tagArray };
    }

    switch (sortBy) {
      case 'popular': order = [['views', 'DESC']]; break;
      case 'oldest': order = [['createdAt', 'ASC']]; break;
      default: order = [['createdAt', 'DESC']]; break;
    }

    const { count, rows } = await Content.findAndCountAll({
      where, order, limit, offset,
      include: [{ 
        model: Model, 
        as: 'model', 
        attributes: ['id', 'model_id', 'name', 'slug', 'photoUrl'] 
      }]
    });

    res.json({
      contents: rows,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    console.error('Erro ao buscar conteúdos:', error);
    res.status(500).json({ error: 'Erro ao buscar conteúdos', details: error.message });
  }
});

// Criar novo conteúdo
router.post('/', async (req, res) => {
  try {
    const contentData = { ...req.body };

    const model = await Model.findOne({ where: { model_id: contentData.model_id } });
    if (!model) {
      return res.status(404).json({ error: 'Modelo não encontrado com o model_id fornecido' });
    }

    // gera slug
    contentData.slug = await generateContentSlug(model.name, contentData.title, contentData.model_id);

    // info
    if (contentData.info) {
      const { images, videos, size } = contentData.info;
      const info = {};
      if (Number(images) > 0) info.images = parseInt(images);
      if (Number(videos) > 0) info.videos = parseInt(videos);
      if (Number(size) > 0)   info.size   = parseInt(size);
      contentData.info = Object.keys(info).length ? info : null;
    }

    const newContent = await Content.create(contentData);

    // cifra apenas os dados internos
    const encrypted = encryptionService.encrypt({
      message: 'success',
      id: newContent.id,
      model_id: newContent.model_id
    });

    // devolve slug em claro + bloco cifrado
    return res.status(201).json({
      ...encrypted,        // { encrypted:true, data:{...}, timestamp }
      slug: newContent.slug
    });

  } catch (error) {
    console.error('Erro ao criar conteúdo:', error);
    return res.status(500).json({ error: 'Erro ao criar conteúdo', details: error.message });
  }
});

// Buscar conteúdo por slug
router.get('/slug/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    const content = await Content.findOne({
      where: { slug, isActive: true },
      include: [{ 
        model: Model, 
        as: 'model', 
        attributes: ['id', 'model_id', 'name', 'photoUrl', 'slug'] 
      }]
    });

    if (!content) return res.status(404).json({ error: 'Conteúdo não encontrado' });
    res.json(content);
  } catch (error) {
    console.error('Erro ao buscar conteúdo:', error);
    res.status(500).json({ error: 'Erro ao buscar conteúdo', details: error.message });
  }
});

// Detalhes do conteúdo por id
router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'id inválido' });

    const content = await Content.findOne({
      where: { id, isActive: true },
      include: [{
        model: Model,
        as: 'model',
        attributes: ['id','model_id','name','photoUrl','slug']
      }]
    });

    if (!content) return res.status(404).json({ error: 'conteúdo não encontrado' });
    res.json(content);
  } catch (err) {
    res.status(500).json({ error: 'erro ao buscar conteúdo', details: err.message });
  }
});

// Registrar visualização
router.post('/:id/view', async (req, res) => {
  try {
    const { id } = req.params;
    const authHeader = req.headers.authorization;
    let userId = null;
    
    if (authHeader) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = require('jsonwebtoken').verify(token, process.env.TOKEN_VERIFY_ACCESS);
        userId = decoded.id;
      } catch (err) {
        // Token inválido, mas continua sem userId
      }
    }

    const content = await Content.findByPk(parseInt(id));
    if (!content) return res.status(404).json({ error: 'Conteúdo não encontrado' });

    await content.increment('views');

    if (userId) {
      await UserHistory.create({
        userId,
        contentId: content.id,
        model_id: content.model_id,
        action: 'view'
      });
    }

    const updated = await Content.findByPk(parseInt(id), { attributes: ['views'] });
    res.json({ message: 'Visualização registrada', views: updated?.views ?? null });
  } catch (error) {
    console.error('Erro ao registrar visualização:', error);
    res.status(500).json({ error: 'Erro ao registrar visualização', details: error.message });
  }
});

// Compartilhar conteúdo
router.post('/:id/share', async (req, res) => {
  try {
    const { id } = req.params;
    const { platform } = req.body;
    const authHeader = req.headers.authorization;
    let userId = null;
    
    if (authHeader) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = require('jsonwebtoken').verify(token, process.env.TOKEN_VERIFY_ACCESS);
        userId = decoded.id;
      } catch (err) {
        // Token inválido, mas continua sem userId
      }
    }

    const content = await Content.findByPk(parseInt(id), {
      include: [{ 
        model: Model, 
        as: 'model', 
        attributes: ['name', 'slug'] 
      }]
    });
    if (!content) return res.status(404).json({ error: 'Conteúdo não encontrado' });

    if (userId) {
      await UserHistory.create({
        userId,
        contentId: content.id,
        model_id: content.model_id,
        action: 'share',
        metadata: { platform }
      });
    }

    const shareUrl = `${process.env.FRONTEND_URL}/model/${content.model.slug}?content=${content.id}`;
    const shareText = `Confira ${content.title} - ${content.model.name}`;
    res.json({ shareUrl, shareText, platform });
  } catch (error) {
    console.error('Erro ao compartilhar conteúdo:', error);
    res.status(500).json({ error: 'Erro ao compartilhar conteúdo', details: error.message });
  }
});

// Atualizar conteúdo
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const content = await Content.findByPk(parseInt(id));
    if (!content) return res.status(404).json({ error: 'Conteúdo não encontrado' });

    const updateData = { ...req.body };

    if (updateData.info) {
      const { images, videos, size } = updateData.info;
      const info = {};
      if (images > 0) info.images = parseInt(images);
      if (videos > 0) info.videos = parseInt(videos);
      if (size > 0) info.size = parseInt(size);
      updateData.info = Object.keys(info).length ? info : null;
    }

    await content.update(updateData);
    res.json(content);
  } catch (error) {
    console.error('Erro ao atualizar conteúdo:', error);
    res.status(500).json({ error: 'Erro ao atualizar conteúdo', details: error.message });
  }
});

// Deletar conteúdo (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const content = await Content.findByPk(parseInt(id));
    if (!content) return res.status(404).json({ error: 'Conteúdo não encontrado' });

    await content.update({ isActive: false });
    res.status(204).send();
  } catch (error) {
    console.error('Erro ao deletar conteúdo:', error);
    res.status(500).json({ error: 'Erro ao deletar conteúdo', details: error.message });
  }
});

module.exports = router;
